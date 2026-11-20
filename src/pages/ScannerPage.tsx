import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type FormEvent } from 'react'
import { useParams } from 'react-router'
import { ApiError } from '../api/client'
import {
  checkIn,
  getStaffSession,
  isNetworkError,
  scanCode,
  searchInvitations,
  staffLogin,
  staffLogout,
  undoCheckIn,
  type ScanResult,
  type SearchResult,
  type StaffSession,
} from '../api/staff'
import QrCameraScanner from '../components/QrCameraScanner'
import { useOfflineStation, type OfflineStation } from '../components/useOfflineStation'
import { clearOfflineData, loadSnapshot } from '../lib/offlineStation'

const timeFmt = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' })

/**
 * Registra el service worker (public/sw.js) y le pasa los archivos que esta página ya cargó:
 * los que se bajaron antes de que tomara el control no pasaron por él y no quedarían guardados.
 */
async function installOfflineApp() {
  if (!('serviceWorker' in navigator) || !import.meta.env.PROD) return
  const sendLoadedFiles = () => {
    const urls = performance
      .getEntriesByType('resource')
      .map((e) => e.name)
      .filter((u) => u.startsWith(`${location.origin}/assets/`))
    navigator.serviceWorker.controller?.postMessage({ type: 'cache-urls', urls })
  }
  try {
    await navigator.serviceWorker.register('/sw.js')
    await navigator.serviceWorker.ready
    sendLoadedFiles()
    // Si en ese momento entra una versión nueva del service worker, también se le avisa a ella.
    navigator.serviceWorker.addEventListener('controllerchange', sendLoadedFiles)
  } catch {
    // Sin service worker la estación funciona igual con señal; solo no abriría sin ella.
  }
}

/**
 * Pantalla de las hostess: entran con link + PIN, escanean QR y registran la entrada.
 * Funciona sin señal con la lista que se guarda en el celular (ver useOfflineStation).
 */
export default function ScannerPage() {
  const { accessId } = useParams()
  const session = useQuery({ queryKey: ['staff-session'], queryFn: getStaffSession, retry: false })

  // Guarda la página en el celular para que abra aunque no haya señal en el salón.
  useEffect(() => {
    void installOfflineApp()
  }, [])

  if (session.isPending) return <main className="page narrow center">Cargando…</main>

  // Sin señal: si este celular ya guardó la lista de este acceso, se trabaja con ella.
  if (session.isError && isNetworkError(session.error)) {
    const saved = accessId ? loadSnapshot(accessId) : null
    if (accessId && saved) return <Station accessId={accessId} onlineSession={null} />
    return (
      <main className="page narrow center">
        <h1>Sin conexión</h1>
        <p className="muted">
          Este celular todavía no tiene la lista de invitados. Abre el link con señal antes del evento (basta una vez)
          para poder trabajar sin internet.
        </p>
      </main>
    )
  }

  // Sin sesión, o con sesión de otro acceso (otro link abierto en el mismo celular).
  const needsLogin = session.isError || (accessId && session.data.accessId !== accessId)
  if (needsLogin) {
    if (session.isError && !(session.error instanceof ApiError && session.error.status === 401))
      return (
        <main className="page narrow center">
          <p className="error">{session.error.message}</p>
        </main>
      )
    if (!accessId)
      return (
        <main className="page narrow center">
          <h1>Acceso de hostess</h1>
          <p className="muted">Abre el link que te compartieron los organizadores del evento.</p>
        </main>
      )
    return <PinForm accessId={accessId} />
  }

  return <Station accessId={session.data!.accessId} onlineSession={session.data!} />
}

function PinForm({ accessId }: { accessId: string }) {
  const queryClient = useQueryClient()
  const [pin, setPin] = useState('')
  const login = useMutation({
    mutationFn: () => staffLogin(accessId, pin),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['staff-session'] }),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    login.mutate()
  }

  return (
    <main className="page narrow center">
      <h1>Acceso de hostess</h1>
      <p className="muted">Escribe el PIN de 6 dígitos que te dieron los organizadores.</p>
      <form className="form pin-form" onSubmit={submit}>
        <input
          className="pin-input"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          aria-label="PIN"
          autoFocus
          required
        />
        {login.error && (
          <p className="error">{isNetworkError(login.error) ? 'Sin conexión. Para entrar la primera vez necesitas señal.' : login.error.message}</p>
        )}
        <button type="submit" disabled={pin.length !== 6 || login.isPending}>
          {login.isPending ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}

const NO_LIST = 'Sin conexión, y este celular todavía no tiene la lista guardada.'

function Station({ accessId, onlineSession }: { accessId: string; onlineSession: StaffSession | null }) {
  const queryClient = useQueryClient()
  const station = useOfflineStation(accessId)
  const [tab, setTab] = useState<'scan' | 'search'>('scan')
  const [result, setResult] = useState<ScanResult | null>(null)
  const [lastCheckInId, setLastCheckInId] = useState<string | null>(null)
  const [scanError, setScanError] = useState<string | null>(null)

  // Con señal, el conteo del servidor (incluye otras puertas); sin ella, la lista guardada más lo pendiente.
  const session = (station.online && onlineSession) || station.session || onlineSession!
  const refreshSession = () => queryClient.invalidateQueries({ queryKey: ['staff-session'] })

  // Cada vez que se baja la lista (al abrir, tras sincronizar, cada 2 min) el conteo del servidor también cambió.
  useEffect(() => {
    if (station.savedAt && station.online) void queryClient.invalidateQueries({ queryKey: ['staff-session'] })
  }, [station.savedAt, station.online, queryClient])

  const scan = useMutation({
    mutationFn: async (content: string): Promise<ScanResult> => {
      if (station.online) {
        try {
          const r = await scanCode(content)
          station.applyResult(r)
          return r
        } catch (e) {
          if (!isNetworkError(e)) throw e
          station.markOffline()
        }
      }
      if (!station.savedAt) throw new Error(NO_LIST)
      const local = await station.lookupQr(content)
      if (!local)
        throw new Error('Esta invitación no está en la lista guardada. Si la agregaron hace poco, búscala por nombre cuando vuelva la señal.')
      return local
    },
    onMutate: () => setScanError(null),
    onSuccess: (r) => {
      navigator.vibrate?.(80)
      setLastCheckInId(null)
      setResult(r)
    },
    onError: (err) => {
      navigator.vibrate?.([60, 60, 60])
      if (err instanceof ApiError && err.status === 401) return refreshSession()
      setScanError(err.message)
    },
  })

  const pick = (item: SearchResult) => {
    if (item.token) return scan.mutate(item.token)
    const local = item.invitationId ? station.lookupId(item.invitationId) : null
    if (local) {
      setLastCheckInId(null)
      setResult(local)
    }
  }

  const logout = useMutation({
    mutationFn: staffLogout,
    onSuccess: () => clearOfflineData(accessId),
    onSettled: () => queryClient.resetQueries({ queryKey: ['staff-session'] }),
  })

  const next = () => {
    setResult(null)
    setLastCheckInId(null)
    setScanError(null)
  }

  return (
    <main className="page narrow scanner">
      <header className="scanner-header">
        <div>
          <strong>{session.eventTitle}</strong>
          <span className="muted small">{session.label}</span>
        </div>
        <div className="scanner-counter" aria-label="Personas que han llegado">
          <span className="stat-value">{session.checkedIn}</span>
          <span className="muted small">de {session.confirmedPasses} confirmados</span>
        </div>
      </header>

      <ConnectionBar station={station} />

      {station.issues.length > 0 && (
        <div className="scan-alert" role="alert">
          <p><strong>Revisa con los organizadores:</strong></p>
          <ul>
            {station.issues.map((issue, i) => (
              <li key={i}>{issue}</li>
            ))}
          </ul>
          <button className="secondary small" onClick={station.dismissIssues}>
            Entendido
          </button>
        </div>
      )}

      {result ? (
        <ResultCard
          key={result.invitationId}
          result={result}
          station={station}
          lastCheckInId={lastCheckInId}
          onChange={(r, checkInId) => {
            setResult(r)
            setLastCheckInId(checkInId)
            if (!r.offline) refreshSession()
          }}
          onNext={next}
        />
      ) : (
        <>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'scan'} className={tab === 'scan' ? '' : 'secondary'} onClick={() => setTab('scan')}>
              Escanear QR
            </button>
            <button role="tab" aria-selected={tab === 'search'} className={tab === 'search' ? '' : 'secondary'} onClick={() => setTab('search')}>
              Buscar por nombre
            </button>
          </div>

          {scanError && (
            <div className="scan-alert" role="alert">
              <p>{scanError}</p>
              <button className="secondary small" onClick={() => setScanError(null)}>
                Intentar de nuevo
              </button>
            </div>
          )}

          {tab === 'scan' ? (
            scan.isPending ? (
              <p className="center">Buscando invitación…</p>
            ) : (
              !scanError && <QrCameraScanner onScan={(content) => scan.mutate(content)} />
            )
          ) : (
            <Search station={station} onPick={pick} />
          )}
        </>
      )}

      {station.pendingCount > 0 ? (
        <p className="muted small center logout">
          Hay {station.pendingCount} {station.pendingCount === 1 ? 'entrada' : 'entradas'} sin subir: no cierres sesión hasta que vuelva la señal.
        </p>
      ) : (
        <button className="link small logout" onClick={() => logout.mutate()}>
          Cerrar sesión
        </button>
      )}
    </main>
  )
}

/** Estado de la conexión: la hostess sabe si lo que ve viene del servidor o de la lista guardada. */
function ConnectionBar({ station }: { station: OfflineStation }) {
  const saved = station.savedAt ? timeFmt.format(new Date(station.savedAt)) : null
  const pending = station.pendingCount
  const pendingText = pending > 0 ? ` · ${pending} ${pending === 1 ? 'entrada' : 'entradas'} por subir` : ''

  if (!station.online)
    return (
      <p className="connection-bar offline" role="status">
        <span className="dot" aria-hidden /> Sin conexión
        {saved ? ` · usando la lista guardada a las ${saved}` : ' · sin lista guardada'}
        {pendingText}
      </p>
    )

  return (
    <p className="connection-bar" role="status">
      <span className="dot" aria-hidden />{' '}
      {station.syncing && pending > 0
        ? `Subiendo ${pending} ${pending === 1 ? 'entrada' : 'entradas'}…`
        : saved
          ? `En línea · lista guardada para usar sin señal (${saved})${pendingText}`
          : 'En línea · guardando la lista para usar sin señal…'}
    </p>
  )
}

function ResultCard({ result, station, lastCheckInId, onChange, onNext }: {
  result: ScanResult
  station: OfflineStation
  lastCheckInId: string | null
  onChange: (r: ScanResult, checkInId: string | null) => void
  onNext: () => void
}) {
  const pendingConfirmed = Math.max(0, result.confirmedPasses - result.checkedIn)
  const suggested = Math.min(result.remaining, result.rsvpStatus === 'Confirmed' && pendingConfirmed > 0 ? pendingConfirmed : result.remaining)
  const [count, setCount] = useState(Math.max(1, suggested))

  /** Con señal se registra en el servidor (que evita rebasar pases entre puertas); sin ella, en el celular. */
  const register = useMutation({
    mutationFn: async (): Promise<{ r: ScanResult; id: string | null }> => {
      if (result.token && station.online) {
        try {
          const r = await checkIn(result.token, count)
          station.applyResult(r)
          return { r, id: r.checkIns[r.checkIns.length - 1]?.id ?? null }
        } catch (e) {
          if (!isNetworkError(e)) throw e
          station.markOffline()
        }
      }
      const item = station.enqueue(result.invitationId, count)
      if (!item) throw new Error(NO_LIST)
      const local = station.lookupId(result.invitationId)!
      return { r: { ...local, token: result.token }, id: item.id }
    },
    onSuccess: ({ r, id }) => onChange(r, id),
  })

  const undo = useMutation({
    mutationFn: async (id: string): Promise<ScanResult> => {
      // Si todavía no se subía, basta con quitarla del celular.
      if (station.removeQueued(id)) return { ...station.lookupId(result.invitationId)!, token: result.token }
      try {
        const r = await undoCheckIn(id)
        station.applyResult(r)
        return r
      } catch (e) {
        if (isNetworkError(e)) throw new Error('Sin conexión: esta entrada ya se había subido. Podrás deshacerla cuando vuelva la señal.')
        throw e
      }
    },
    onSuccess: (r) => onChange(r, null),
  })

  const tablesText =
    result.tables.length === 0 ? 'Mesa sin asignar' : `${result.tables.length === 1 ? 'Mesa' : 'Mesas'} ${result.tables.join(', ')}`
  const justRegistered = lastCheckInId !== null
  const savedOffline = justRegistered && result.checkIns.some((c) => c.id === lastCheckInId && c.pending)
  const full = result.remaining === 0

  return (
    <section className={`card result-card${justRegistered ? ' ok' : full ? ' full' : ''}`}>
      {justRegistered && (
        <p className="result-banner">{savedOffline ? '✓ Entrada guardada en el celular (se sube al volver la señal)' : '✓ Entrada registrada'}</p>
      )}
      {result.offline && !justRegistered && <p className="result-offline">Sin conexión · datos de la lista guardada</p>}
      <h1 className="result-name">{result.displayName}</h1>
      <p className="result-table">{tablesText}</p>

      <dl className="result-facts">
        <div>
          <dt>Pases</dt>
          <dd>{result.passes}</dd>
        </div>
        <div>
          <dt>Confirmados</dt>
          <dd>{result.rsvpStatus === 'Confirmed' ? result.confirmedPasses : '—'}</dd>
        </div>
        <div>
          <dt>Ya entraron</dt>
          <dd>{result.checkedIn}</dd>
        </div>
      </dl>

      {result.warnings.map((w) => (
        <p key={w} className="result-warning">
          {w}
        </p>
      ))}

      {result.guests.length > 0 && (
        <ul className="result-guests">
          {result.guests.map((g, i) => (
            <li key={i}>
              <span>{g.name}</span>
              <span className="muted">{g.tableNumber ? `Mesa ${g.tableNumber}` : ''}</span>
            </li>
          ))}
        </ul>
      )}

      {!justRegistered && !full && (
        <div className="checkin-row">
          <div className="stepper" aria-label="Personas que entran">
            <button className="secondary" onClick={() => setCount((c) => Math.max(1, c - 1))} disabled={count <= 1} aria-label="Menos">
              −
            </button>
            <span>{count}</span>
            <button className="secondary" onClick={() => setCount((c) => Math.min(result.remaining, c + 1))} disabled={count >= result.remaining} aria-label="Más">
              +
            </button>
          </div>
          <button className="big" onClick={() => register.mutate()} disabled={register.isPending}>
            {register.isPending ? 'Registrando…' : `Registrar entrada (${count})`}
          </button>
        </div>
      )}
      {full && !justRegistered && <p className="result-warning">Ya entraron todos los lugares de esta invitación.</p>}
      {(register.error || undo.error) && <p className="error">{(register.error ?? undo.error)!.message}</p>}

      <div className="actions">
        <button className="big" onClick={onNext}>
          Escanear siguiente
        </button>
        {justRegistered && (
          <button className="secondary" onClick={() => undo.mutate(lastCheckInId)} disabled={undo.isPending}>
            Deshacer
          </button>
        )}
      </div>
    </section>
  )
}

function Search({ station, onPick }: { station: OfflineStation; onPick: (item: SearchResult) => void }) {
  const [q, setQ] = useState('')
  const term = q.trim()
  const results = useQuery({
    queryKey: ['staff-search', term, station.online],
    queryFn: async () => {
      if (!station.online) return station.search(term)
      try {
        return await searchInvitations(term)
      } catch (e) {
        if (!isNetworkError(e)) throw e
        station.markOffline()
        return station.search(term)
      }
    },
    enabled: term.length >= 2,
  })

  return (
    <div className="search">
      <input
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Apellido o nombre del invitado"
        aria-label="Buscar invitado"
        autoFocus
      />
      {results.data?.length === 0 && <p className="muted">Sin resultados.</p>}
      <ul className="search-results">
        {results.data?.map((r) => (
          <li key={r.token ?? r.invitationId}>
            <button className="secondary" onClick={() => onPick(r)}>
              <strong>{r.displayName}</strong>
              <span className="muted small">
                {r.passes} pases · {r.checkedIn > 0 ? `ya entraron ${r.checkedIn}` : 'no ha llegado'}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
