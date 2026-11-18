import { Link } from 'react-router'
import ThemeToggle from '../../theme/ThemeToggle'
import Logo from '../brand/Logo'

/** Encabezado del sitio público (inicio y login). */
export default function SiteHeader({ links = true }: { links?: boolean }) {
  return (
    <header className="site-header">
      <Link to="/" className="brand" aria-label="Lacre, inicio">
        <Logo />
      </Link>
      {links && (
        <nav className="site-nav" aria-label="Secciones">
          <a href="/#como-funciona">Cómo funciona</a>
          <a href="/#disenos">Diseños</a>
          <a href="/#precios">Precios</a>
          <a href="/#preguntas">Preguntas</a>
        </nav>
      )}
      <div className="site-header-actions">
        <ThemeToggle />
        <Link to="/login" className="button secondary small hide-xs">
          Iniciar sesión
        </Link>
        <Link to="/login?modo=registro" className="button small">
          Crear invitación
        </Link>
      </div>
    </header>
  )
}
