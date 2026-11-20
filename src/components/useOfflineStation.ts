import { useCallback, useEffect, useRef, useState } from 'react'
import {
  getOfflineSnapshot,
  isNetworkError,
  syncCheckIns,
  type OfflineSnapshot,
  type QueuedCheckIn,
  type ScanResult,
  type SearchResult,
  type StaffSession,
} from '../api/staff'
import {
  findById,
  findByQr,
  loadQueue,
  loadSnapshot,
  newQueuedCheckIn,
  saveQueue,
  saveSnapshot,
  searchLocal,
  sessionFrom,
} from '../lib/offlineStation'

/** Con señal: la lista se actualiza cada 2 min (otras puertas, confirmaciones de última hora). */
const REFRESH_MS = 2 * 60_000
/** Sin señal o con entradas pendientes, se reintenta seguido para salir del modo sin conexión pronto. */
const RETRY_MS = 20_000
/** Máximo por envío; igual que CheckInRules.MaxOfflineBatch. */
const BATCH = 200

export interface OfflineStation {
  /** Hora de la lista guardada, o null si este celular todavía no la tiene. */
  savedAt: string | null
  pendingCount: number
  /** Según la última petición (navigator.onLine solo dice si hay Wi-Fi/datos, no si hay internet). */
  online: boolean
  syncing: boolean
  /** Entradas sin conexión que al subirlas resultaron raras (rebasaron pases, invitación borrada). */
  issues: string[]
  dismissIssues: () => void
  markOffline: () => void
  /** Encabezado (llegadas / confirmados) con lo guardado más lo pendiente. */
  session: StaffSession | null
  lookupQr: (content: string) => Promise<ScanResult | null>
  lookupId: (invitationId: string) => ScanResult | null
  search: (q: string) => SearchResult[]
  /** Registra la entrada en el celular. null si no hay lista guardada. */
  enqueue: (invitationId: string, count: number, guestIds?: string[]) => QueuedCheckIn | null
  /** Quita una entrada que aún no se sube. false si ya estaba sincronizada. */
  removeQueued: (id: string) => boolean
  /** Guarda en la lista local lo que respondió el servidor (para que siga al día si se cae la señal). */
  applyResult: (r: ScanResult) => void
}

export function useOfflineStation(accessId: string): OfflineStation {
  const [snapshot, setSnapshotState] = useState(() => loadSnapshot(accessId))
  const [queue, setQueueState] = useState(() => loadQueue(accessId))
  const [online, setOnlineState] = useState(() => navigator.onLine)
  const [syncing, setSyncing] = useState(false)
  const [issues, setIssues] = useState<string[]>([])
  const queueRef = useRef(queue)
  const snapshotRef = useRef(snapshot)
  const onlineRef = useRef(online)
  const busy = useRef(false)

  const setOnline = useCallback((v: boolean) => {
    onlineRef.current = v
    setOnlineState(v)
  }, [])

  const setQueue = useCallback(
    (update: (q: QueuedCheckIn[]) => QueuedCheckIn[]) => {
      const next = update(queueRef.current)
      queueRef.current = next
      saveQueue(accessId, next)
      setQueueState(next)
    },
    [accessId],
  )

  const setSnapshot = useCallback(
    (s: OfflineSnapshot) => {
      snapshotRef.current = s
      saveSnapshot(accessId, s)
      setSnapshotState(s)
    },
    [accessId],
  )

  const refresh = useCallback(async () => {
    try {
      setSnapshot(await getOfflineSnapshot())
      setOnline(true)
    } catch (e) {
      if (isNetworkError(e)) setOnline(false)
    }
  }, [setOnline, setSnapshot])

  const syncNow = useCallback(async () => {
    if (busy.current) return
    busy.current = true
    setSyncing(true)
    try {
      while (queueRef.current.length > 0) {
        const batch = queueRef.current.slice(0, BATCH)
        const { results } = await syncCheckIns(batch)
        const nameOf = (id: string) => {
          const item = batch.find((b) => b.id === id)
          return snapshotRef.current?.invitations.find((i) => i.id === item?.invitationId)?.displayName ?? 'Una invitación'
        }
        const found: string[] = []
        for (const r of results) {
          if (r.status === 'exceeded') found.push(`${nameOf(r.id)}: entraron más personas que sus pases (otra puerta también la registró sin conexión).`)
          if (r.status === 'notFound') found.push(`${nameOf(r.id)}: la invitación ya no existe; no se guardó su entrada.`)
          if (r.status === 'invalid') found.push(`${nameOf(r.id)}: la entrada no era válida y no se guardó.`)
        }
        if (found.length) setIssues((prev) => [...prev, ...found])
        // Todos los estados son definitivos (incluido "duplicate"): ya no hay que reenviarlos.
        const done = new Set(results.map((r) => r.id))
        if (done.size === 0) break
        setQueue((q) => q.filter((item) => !done.has(item.id)))
      }
      setOnline(true)
      await refresh()
    } catch (e) {
      if (isNetworkError(e)) setOnline(false)
    } finally {
      busy.current = false
      setSyncing(false)
    }
  }, [refresh, setOnline, setQueue])

  // Al abrir la estación: subir lo pendiente (si quedó algo de antes) y bajar la lista.
  useEffect(() => {
    void (queueRef.current.length > 0 ? syncNow() : refresh())
  }, [refresh, syncNow])

  useEffect(() => {
    const goOnline = () => void syncNow()
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    let lastRefresh = Date.now()
    const timer = setInterval(() => {
      if (queueRef.current.length > 0) return void syncNow()
      if (!onlineRef.current || Date.now() - lastRefresh >= REFRESH_MS) {
        lastRefresh = Date.now()
        void refresh()
      }
    }, RETRY_MS)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(timer)
    }
  }, [refresh, setOnline, syncNow])

  return {
    savedAt: snapshot?.generatedAt ?? null,
    pendingCount: queue.length,
    online,
    syncing,
    issues,
    dismissIssues: () => setIssues([]),
    markOffline: () => setOnline(false),
    session: snapshot ? sessionFrom(snapshot, queue) : null,
    lookupQr: async (content) =>
      snapshotRef.current ? findByQr(snapshotRef.current, queueRef.current, content) : null,
    lookupId: (id) => (snapshotRef.current ? findById(snapshotRef.current, queueRef.current, id) : null),
    search: (q) => (snapshotRef.current ? searchLocal(snapshotRef.current, queueRef.current, q) : []),
    enqueue: (invitationId, count, guestIds = []) => {
      if (!snapshotRef.current) return null
      const item = newQueuedCheckIn(invitationId, count, guestIds)
      setQueue((q) => [...q, item])
      return item
    },
    removeQueued: (id) => {
      if (!queueRef.current.some((q) => q.id === id)) return false
      setQueue((q) => q.filter((item) => item.id !== id))
      return true
    },
    applyResult: (r) => {
      const s = snapshotRef.current
      const inv = s?.invitations.find((i) => i.id === r.invitationId)
      if (!s || !inv || r.offline) return
      const sum = (list: { count: number }[]) => list.reduce((t, c) => t + c.count, 0)
      setSnapshot({
        ...s,
        session: { ...s.session, checkedIn: s.session.checkedIn - sum(inv.checkIns) + sum(r.checkIns) },
        invitations: s.invitations.map((i) =>
          i.id === r.invitationId
            ? { ...i, checkIns: r.checkIns, rsvpStatus: r.rsvpStatus, confirmedPasses: r.confirmedPasses, guests: r.guests }
            : i,
        ),
      })
    },
  }
}
