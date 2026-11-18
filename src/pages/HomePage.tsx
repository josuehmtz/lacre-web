import { useQuery } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { getPlans } from '../api/client'
import { formatMxn } from '../api/billing'
import { Seal } from '../components/brand/Logo'
import SiteFooter from '../components/layout/SiteFooter'
import SiteHeader from '../components/layout/SiteHeader'
import InvitationView from '../templates/InvitationView'
import { resolveConfig } from '../templates/registry'
import type { TemplateEvent, TemplateKey } from '../templates/types'
import './home.css'

// Fechas de ejemplo siempre en el futuro, para que la cuenta regresiva se vea.
const inMonths = (m: number, hour: number) => {
  const d = new Date()
  d.setMonth(d.getMonth() + m, 14)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const samples: { key: TemplateKey; name: string; tagline: string; event: TemplateEvent; guest: string; passes: number }[] = [
  {
    key: 'clasica',
    name: 'Clásica',
    tagline: 'La elegancia de siempre, con detalles en dorado',
    event: { title: 'Ana & Luis', type: 'Wedding', startsAt: inMonths(5, 17), venueName: 'Hacienda San Gabriel', venueAddress: 'Tequisquiapan, Querétaro', mapsUrl: null, rsvpDeadline: null },
    guest: 'Familia Pérez',
    passes: 4,
  },
  {
    key: 'jardin',
    name: 'Jardín',
    tagline: 'Romántica y delicada, soñada para tus XV',
    event: { title: 'Sofía', type: 'Quinceanera', startsAt: inMonths(3, 20), venueName: 'Jardín Las Magnolias', venueAddress: 'Guadalajara, Jalisco', mapsUrl: null, rsvpDeadline: null },
    guest: 'Tíos Ramírez',
    passes: 2,
  },
  {
    key: 'moderna',
    name: 'Moderna',
    tagline: 'Limpia y directa, para parejas sin rodeos',
    event: { title: 'Mariana & Diego', type: 'Wedding', startsAt: inMonths(7, 19), venueName: 'Casa Lamm', venueAddress: 'Ciudad de México', mapsUrl: null, rsvpDeadline: null },
    guest: 'Familia Ortega',
    passes: 3,
  },
]

function TemplatePreview({ sample, scroll }: { sample: (typeof samples)[number]; scroll?: boolean }) {
  return (
    <div className={`device${scroll ? ' device-scroll' : ''}`} aria-hidden>
      <div className="device-screen">
        <div className="device-content">
          <InvitationView
            templateKey={sample.key}
            config={resolveConfig(sample.key, sample.event, null)}
            event={sample.event}
            guest={{ displayName: sample.guest, passes: sample.passes }}
          />
        </div>
      </div>
    </div>
  )
}

const steps = [
  {
    title: 'Elige tu estilo',
    text: 'Escoge el diseño que va contigo y ponle sus nombres, la fecha, el itinerario y hasta la mesa de regalos. La ves tal cual la verán tus invitados.',
  },
  {
    title: 'Envíala por WhatsApp',
    text: 'Cada familia recibe su invitación con su nombre y los lugares que les apartaste. Se acabó el “¿puedo llevar a alguien?”.',
  },
  {
    title: 'Recibe sus respuestas',
    text: 'Confirman con un toque, te dejan unas palabras bonitas y les llega su pase de entrada. Tú sabes al momento cuántos van.',
  },
  {
    title: 'Disfruta tu fiesta',
    text: 'En la puerta, tus hostess escanean el pase y saben a qué mesa va cada quien. Tú solo te preocupas por bailar.',
  },
]

const features: { title: string; text: string; icon: ReactNode }[] = [
  {
    title: 'Sabes quién sí va',
    text: 'Olvídate de perseguir confirmaciones por mensaje: ves quién viene, cuántos son y cómo se llaman.',
    icon: <path d="M5 12.5 10 17 19 7" />,
  },
  {
    title: 'Un pase para cada familia',
    text: 'Al confirmar, cada familia recibe su pase personal de entrada. Solo pasa quien tú invitaste.',
    icon: <><rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><path d="M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2M18 14h2" /></>,
  },
  {
    title: 'Tus mesas, a tu manera',
    text: 'Dibuja tu salón, acomoda las mesas donde van y sienta a cada invitado junto a quien quieras.',
    icon: <><circle cx="7" cy="8" r="3" /><circle cx="17" cy="8" r="3" /><rect x="9" y="14" width="6" height="6" rx="1" /></>,
  },
  {
    title: 'Una recepción sin filas',
    text: 'Tus hostess solo necesitan su celular para recibir a todos y llevarlos directo a su lugar.',
    icon: <><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  },
  {
    title: 'Recordatorios con cariño',
    text: '¿Tu tío aún no contesta? Mándale un recordatorio por WhatsApp, ya escrito, con un solo toque.',
    icon: <path d="M4 20l1.5-4.5A8 8 0 1 1 8.5 19Z" />,
  },
  {
    title: 'Paga como prefieras',
    text: 'Con tarjeta o en efectivo en OXXO. Es un solo pago y tu evento queda listo, sin mensualidades.',
    icon: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></>,
  },
]

const included = [
  'Los 3 diseños, con tus colores y textos',
  'Confirmaciones y pases de entrada',
  'Tu salón y el acomodo de mesas',
  'Todas las hostess que necesites',
  'Recordatorios por WhatsApp',
]

const faqs = [
  {
    q: '¿Mis invitados tienen que descargar algo?',
    a: 'Nada. Abren su invitación desde el mensaje que les mandas, en cualquier celular. Tan fácil que hasta las abuelitas la pueden ver.',
  },
  {
    q: '¿Puedo armarla antes de pagar?',
    a: 'Claro. Diseña tu invitación, agrega a tus invitados y revísala las veces que quieras. Pagas solo cuando todo esté perfecto y quieras enviarla.',
  },
  {
    q: '¿Y si al final invito a más personas?',
    a: 'Pasa siempre. Cambias a un paquete más grande cuando lo necesites y solo pagas la diferencia.',
  },
  {
    q: '¿Cómo es la entrada el día del evento?',
    a: 'Desde tu panel les das acceso a tus hostess. Con su celular escanean el pase de cada invitado y ven su nombre y su mesa al instante. Si alguien olvidó su teléfono, lo buscan por nombre.',
  },
  {
    q: '¿Puedo pagar en efectivo?',
    a: 'Sí, en cualquier OXXO, o con tarjeta de crédito o débito. Tu evento queda listo en cuanto se refleja tu pago.',
  },
]

const featureSvg = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

export default function HomePage() {
  const plans = useQuery({ queryKey: ['plans'], queryFn: getPlans })
  const popular = plans.data?.[Math.floor((plans.data.length - 1) / 2)]?.code

  return (
    <div className="home">
      <SiteHeader />

      <main>
        <section className="hero">
          <div className="hero-glow" aria-hidden />
          <div className="hero-copy">
            <p className="eyebrow">Para bodas, XV años y fiestas que se recuerdan</p>
            <h1>
              Tu celebración,
              <br />
              <em>sellada con elegancia.</em>
            </h1>
            <p className="hero-lead">
              Una invitación tan especial como tu día, que además te ayuda a organizarlo: sabes quién viene, dónde
              se sienta cada quien y, al llegar, tus invitados entran con solo mostrar su celular.
            </p>
            <div className="hero-ctas">
              <Link to="/login?modo=registro" className="button button-gold big">
                Crear mi invitación
              </Link>
              <a href="#como-funciona" className="button secondary big">
                Ver cómo funciona
              </a>
            </div>
            <ul className="hero-trust">
              <li>Tus invitados no descargan nada</li>
              <li>Diseña gratis</li>
              <li>Un solo pago, sin mensualidades</li>
            </ul>
          </div>

          <div className="hero-visual">
            <TemplatePreview sample={samples[0]} scroll />
            <div className="float-card float-rsvp">
              <span className="float-check" aria-hidden>✓</span>
              <div>
                <strong>Familia Pérez confirmó</strong>
                <span className="muted small">4 lugares · ¡ahí estaremos!</span>
              </div>
            </div>
            <div className="float-card float-table">
              <Seal size={38} />
              <div>
                <span className="muted small">Bienvenidos</span>
                <strong>Mesa 7</strong>
              </div>
            </div>
          </div>
        </section>

        <section id="como-funciona" className="section">
          <div className="section-head">
            <p className="eyebrow">Cómo funciona</p>
            <h2>De la invitación a la pista de baile</h2>
          </div>
          <ol className="steps">
            {steps.map((s, i) => (
              <li key={s.title} className="step">
                <span className="step-number">{String(i + 1).padStart(2, '0')}</span>
                <h3>{s.title}</h3>
                <p className="muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="section">
          <div className="section-head">
            <p className="eyebrow">Menos pendientes</p>
            <h2>Todo lo que te quita el estrés</h2>
          </div>
          <div className="features">
            {features.map((f) => (
              <article key={f.title} className="feature">
                <span className="feature-icon">
                  <svg {...featureSvg}>{f.icon}</svg>
                </span>
                <h3>{f.title}</h3>
                <p className="muted">{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="disenos" className="section section-alt">
          <div className="section-head">
            <p className="eyebrow">Diseños</p>
            <h2>Diseños que enamoran</h2>
            <p className="muted">Cada uno se adapta a tus colores y a tu estilo. Así los verán tus invitados en su celular:</p>
          </div>
          <div className="showcase">
            {samples.map((s) => (
              <figure key={s.key} className="showcase-item">
                <TemplatePreview sample={s} />
                <figcaption>
                  <strong>{s.name}</strong>
                  <span className="muted small">{s.tagline}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section id="precios" className="section">
          <div className="section-head">
            <p className="eyebrow">Precios</p>
            <h2>Un solo pago por tu evento</h2>
            <p className="muted">
              Elige según cuántos invitados tendrás. Si tu lista crece, cambias de paquete pagando solo la diferencia.
            </p>
          </div>
          {plans.isError && <p className="muted center">No pudimos cargar los precios. Intenta de nuevo en un momento.</p>}
          <div className="pricing">
            {(plans.data ?? []).map((p) => (
              <article key={p.code} className={`price-card${p.code === popular ? ' featured' : ''}`}>
                {p.code === popular && <span className="price-badge">El favorito</span>}
                <h3>{p.name}</h3>
                <p className="price">
                  {formatMxn(p.priceMxn)}
                  <span className="muted small"> MXN</span>
                </p>
                <p className="muted">Hasta {p.maxPasses} invitados</p>
                <ul className="price-list">
                  {included.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Link to="/login?modo=registro" className={`button${p.code === popular ? ' button-gold' : ' secondary'}`}>
                  Comenzar
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section id="preguntas" className="section section-narrow">
          <div className="section-head">
            <p className="eyebrow">Preguntas frecuentes</p>
            <h2>Lo que seguro te estás preguntando</h2>
          </div>
          <div className="faq">
            {faqs.map((f) => (
              <details key={f.q}>
                <summary>{f.q}</summary>
                <p className="muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cta-band">
          <Seal size={64} />
          <h2>Que la entrada también sea parte del recuerdo</h2>
          <p>Arma tu invitación hoy, sin costo, y envíala cuando todo esté perfecto.</p>
          <Link to="/login?modo=registro" className="button button-gold big">
            Crear mi invitación
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
