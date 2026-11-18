import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { createEvent, eventStatusLabels, eventTypeLabels, getEvents } from '../api/events'
import EventForm from '../components/EventForm'
import { formatDateTime } from '../lib/dates'
import { plural } from '../lib/text'
import { Seal } from '../components/brand/Logo'

const monthFmt = new Intl.DateTimeFormat('es-MX', { month: 'short' })

export default function DashboardPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [creating, setCreating] = useState(false)
  const events = useQuery({ queryKey: ['events'], queryFn: getEvents })

  const create = useMutation({
    mutationFn: createEvent,
    onSuccess: (ev) => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      navigate(`/app/events/${ev.id}`)
    },
  })

  return (
    <main className="page">
      <div className="page-header">
        <div>
          <p className="eyebrow">Tu panel</p>
          <h1>Mis eventos</h1>
        </div>
        {!creating && events.data && events.data.length > 0 && (
          <button onClick={() => setCreating(true)}>+ Nuevo evento</button>
        )}
      </div>

      {creating && (
        <section className="card">
          <h2>Nuevo evento</h2>
          <EventForm
            submitLabel="Crear evento"
            pending={create.isPending}
            error={create.error?.message}
            onSubmit={(data) => create.mutate(data)}
            onCancel={() => setCreating(false)}
          />
        </section>
      )}

      {events.isPending && <p>Cargando…</p>}
      {events.isError && <p className="error">{events.error.message}</p>}
      {events.data?.length === 0 && !creating && (
        <section className="empty-state card">
          <Seal size={72} />
          <h2>Tu primera celebración empieza aquí</h2>
          <p className="muted">
            Crea tu evento, diseña la invitación y carga a tus invitados. Puedes hacerlo todo gratis y publicarlo cuando
            estés listo.
          </p>
          <button className="big" onClick={() => setCreating(true)}>
            Crear mi primer evento
          </button>
        </section>
      )}

      <ul className="event-list">
        {events.data?.map((ev) => {
          const d = new Date(ev.startsAt)
          return (
            <li key={ev.id}>
              <Link to={`/app/events/${ev.id}`} className="card event-card">
                <div className="event-date" aria-hidden>
                  <span className="event-date-day">{d.getDate()}</span>
                  <span className="event-date-month">{monthFmt.format(d)}</span>
                </div>
                <div className="event-card-main">
                  <strong className="event-card-title">{ev.title}</strong>
                  <span className="muted small">
                    {eventTypeLabels[ev.type]} · {formatDateTime(ev.startsAt)}
                    {ev.venueName && ` · ${ev.venueName}`}
                  </span>
                </div>
                <div className="event-card-stats">
                  <span className={`badge status-${ev.status.toLowerCase()}`}>{eventStatusLabels[ev.status]}</span>
                  <span className="muted small">
                    {plural(ev.invitationCount, 'invitación', 'invitaciones')} ·{' '}
                    {plural(ev.totalPasses, 'invitado', 'invitados')}
                  </span>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </main>
  )
}
