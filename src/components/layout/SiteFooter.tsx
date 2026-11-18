import { Link } from 'react-router'
import Logo from '../brand/Logo'

const YEAR = new Date().getFullYear()

export default function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="site-footer-brand">
          <Logo size={30} />
          <p className="muted small">
            Invitaciones digitales para bodas, XV años y todas las fiestas que merecen recordarse. Hecho con cariño en
            México.
          </p>
        </div>
        <nav className="site-footer-links" aria-label="Pie de página">
          <a href="/#como-funciona">Cómo funciona</a>
          <a href="/#precios">Precios</a>
          <Link to="/login">Iniciar sesión</Link>
        </nav>
      </div>
      <p className="muted small site-footer-copy">© {YEAR} Lacre. Todos los derechos reservados.</p>
    </footer>
  )
}
