import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Link, Navigate } from 'react-router'
import { eventStatusLabels } from '../api/events'
import {
  createVenue,
  createVenueInvite,
  formatDateOnly,
  getAccount,
  getVenueEvents,
  getVenues,
  joinUrl,
  removeVenueMember,
  updateVenue,
  type CreatedLink,
  type SaveVenue,
  type Venue,
} from '../api/venues'
import { formatDateTime } from '../lib/dates'
import { plural } from '../lib/text'
import { useConfirm } from '../lib/confirm'

/** Panel de Lacre: salones con convenio, su personal y los eventos que han dado de alta. */
export default function AdminPage() {
  const account = useQuery({ queryKey: ['account'], queryFn: getAccount })
  const venues = useQuery({ queryKey: ['admin-venues'], queryFn: getVenues, enabled: account.data?.isAdmin === true })
  const [creating, setCreating] = useState(false)

  if (account.isPending) return <main className="page">Cargando…</main>
  if (!account.data?.isAdmin) return <Navigate to="/app" replace />

  return (
    <main className="page">
      <Link to="/app" className="back">
        ← Mis eventos
      </Link>
      <div className="page-header">
        <div>
          <p className="eyebrow">Administración</p>
          <h1>Salones con convenio</h1>
        </div>
        {!creating && <button onClick={() => setCreating(true)}>+ Nuevo salón</button>}
      </div>

      {creating && (
        <section className="card">
          <h2>Nuevo salón</h2>
          <VenueForm onDone={() => setCreating(false)} />
        </section>
      )}

      {venues.isPending && <p>Cargando…</p>}
      {venues.isError && <p className="error">{venues.error.message}</p>}
      {venues.data?.length === 0 && !creating && (
        <p className="muted">Aún no hay salones. Da de alta el primero con las fechas de su convenio.</p>
      )}
      {venues.data?.map((v) => (
        <VenueCard key={v.id} venue={v} />
      ))}
    </main>
  )
}

function VenueCard({ venue }: { venue: Venue }) {
  const queryClient = useQueryClient()
  const confirm = useConfirm()
  const [editing, setEditing] = useState(false)
  const [showEvents, setShowEvents] = useState(false)
  const [invite, setInvite] = useState<CreatedLink | null>(null)
  const [copied, setCopied] = useState(false)

  const events = useQuery({
    queryKey: ['admin-venue-events', venue.id],
    queryFn: () => getVenueEvents(venue.id),
    enabled: showEvents,
  })

  const createInvite = useMutation({
    mutationFn: () => createVenueInvite(venue.id),
    onSuccess: (link) => {
      setInvite(link)
      setCopied(false)
    },
  })

  const removeMember = useMutation({
    mutationFn: (userId: string) => removeVenueMember(venue.id, userId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-venues'] }),
  })

  if (editing)
    return (
      <section className="card">
        <h2>Editar {venue.name}</h2>
        <VenueForm venue={venue} onDone={() => setEditing(false)} />
      </section>
    )

  const inviteMessage = invite
    ? `Hola, este es tu acceso a Lacre como personal de ${venue.name}. Ábrelo, inicia sesión o crea tu cuenta y acepta: ${joinUrl(invite.token)}`
    : ''

  return (
    <section className="card">
      <div className="page-header">
        <div>
          <h2>{venue.name}</h2>
          <p className="muted small">
            Convenio del {formatDateOnly(venue.agreementStartsOn)} al {formatDateOnly(venue.agreementEndsOn)}
            {venue.contactName && ` · ${venue.contactName}`}
            {venue.phone && ` · ${venue.phone}`}
          </p>
          {venue.notes && <p className="muted small">{venue.notes}</p>}
        </div>
        <span className={`badge${venue.agreementActive ? ' rsvp-confirmed' : ''}`}>
          {venue.agreementActive ? 'Vigente' : 'No vigente'}
        </span>
      </div>

      <div>
        <h3 className="small-heading">Personal ({venue.members.length})</h3>
        {venue.members.length === 0 ? (
          <p className="muted small">Nadie del salón se ha unido todavía. Genera un link de acceso y envíaselo.</p>
        ) : (
          <ul className="staff-list">
            {venue.members.map((m) => (
              <li key={m.userId} className="page-header">
                <span>{m.email}</span>
                <button
                  className="secondary small"
                  disabled={removeMember.isPending}
                  onClick={async () => {
                    if (
                      await confirm({
                        title: `¿Quitar a ${m.email}?`,
                        message: `Dejará de ver y editar los eventos de ${venue.name}. Los eventos no se borran.`,
                        confirmLabel: 'Quitar',
                        danger: true,
                      })
                    )
                      removeMember.mutate(m.userId)
                  }}
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {invite && (
        <div className="pin-box">
          <span className="small">
            Link para una persona del salón (un solo uso, vence el {formatDateTime(invite.expiresAt)}):
          </span>
          <code className="staff-link">{joinUrl(invite.token)}</code>
          <div className="actions">
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(inviteMessage)
                setCopied(true)
              }}
            >
              {copied ? '¡Copiado!' : 'Copiar mensaje'}
            </button>
            <a
              className="button secondary"
              href={`https://wa.me/?text=${encodeURIComponent(inviteMessage)}`}
              target="_blank"
              rel="noreferrer"
            >
              Enviar por WhatsApp
            </a>
          </div>
        </div>
      )}

      <div className="actions">
        <button onClick={() => createInvite.mutate()} disabled={createInvite.isPending}>
          {createInvite.isPending ? 'Generando…' : 'Generar link de acceso'}
        </button>
        <button className="secondary" onClick={() => setShowEvents((s) => !s)}>
          {showEvents ? 'Ocultar eventos' : `Ver eventos (${venue.eventCount})`}
        </button>
        <button className="secondary" onClick={() => setEditing(true)}>
          Editar
        </button>
      </div>
      {createInvite.error && <p className="error">{createInvite.error.message}</p>}
      {removeMember.error && <p className="error">{removeMember.error.message}</p>}

      {showEvents && (
        <div className="table-wrap">
          {events.isPending && <p className="muted">Cargando…</p>}
          {events.data?.length === 0 && <p className="muted small">El salón no ha dado de alta eventos.</p>}
          {events.data && events.data.length > 0 && (
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Fecha</th>
                  <th>Paquete</th>
                  <th>Alta</th>
                  <th>Cliente</th>
                </tr>
              </thead>
              <tbody>
                {events.data.map((e) => (
                  <tr key={e.id}>
                    <td>{e.title}</td>
                    <td>{formatDateTime(e.startsAt)}</td>
                    <td>
                      {e.planName ?? '—'} <span className="muted small">({eventStatusLabels[e.status]})</span>
                    </td>
                    <td>{formatDateTime(e.createdAt)}</td>
                    <td>{e.hasClient ? 'Vinculado' : 'Pendiente'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {events.data && events.data.length > 0 && (
            <p className="muted small">{plural(events.data.length, 'evento', 'eventos')} dados de alta por el salón.</p>
          )}
        </div>
      )}
    </section>
  )
}

/** Fecha local (no UTC: de noche en México, toISOString ya da el día siguiente). */
const isoDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
const today = () => isoDate(new Date())
const inOneYear = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  d.setDate(d.getDate() - 1)
  return isoDate(d)
}

function VenueForm({ venue, onDone }: { venue?: Venue; onDone: () => void }) {
  const queryClient = useQueryClient()
  const [name, setName] = useState(venue?.name ?? '')
  const [contactName, setContactName] = useState(venue?.contactName ?? '')
  const [phone, setPhone] = useState(venue?.phone ?? '')
  const [notes, setNotes] = useState(venue?.notes ?? '')
  const [startsOn, setStartsOn] = useState(venue?.agreementStartsOn ?? today())
  const [endsOn, setEndsOn] = useState(venue?.agreementEndsOn ?? inOneYear())

  const save = useMutation({
    mutationFn: (data: SaveVenue) => (venue ? updateVenue(venue.id, data) : createVenue(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-venues'] })
      onDone()
    },
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    save.mutate({
      name,
      contactName: contactName || null,
      phone: phone || null,
      notes: notes || null,
      agreementStartsOn: startsOn,
      agreementEndsOn: endsOn,
    })
  }

  return (
    <form onSubmit={submit} className="form grid-2">
      <label className="span-2">
        Nombre del salón
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={200} />
      </label>
      <label>
        Contacto
        <input value={contactName} onChange={(e) => setContactName(e.target.value)} maxLength={200} />
      </label>
      <label>
        Teléfono
        <input value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={20} />
      </label>
      <label>
        Inicio del convenio
        <input type="date" value={startsOn} onChange={(e) => setStartsOn(e.target.value)} required />
      </label>
      <label>
        Fin del convenio
        <input type="date" value={endsOn} onChange={(e) => setEndsOn(e.target.value)} required />
      </label>
      <label className="span-2">
        Notas (paquetes incluidos, forma de pago acordada…)
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} rows={3} />
      </label>
      {save.error && <p className="error span-2">{save.error.message}</p>}
      <div className="actions span-2">
        <button type="submit" disabled={save.isPending}>
          {save.isPending ? 'Guardando…' : 'Guardar'}
        </button>
        <button type="button" className="secondary" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  )
}
