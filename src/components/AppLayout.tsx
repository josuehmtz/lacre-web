import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, Outlet, useLocation, useNavigate } from 'react-router'
import { getMe, logout } from '../api/auth'
import { getAccount } from '../api/venues'
import ThemeToggle from '../theme/ThemeToggle'
import Logo from './brand/Logo'

/** Marco del panel del cliente: exige sesión y muestra la barra superior. */
export default function AppLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const location = useLocation()
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })
  const account = useQuery({ queryKey: ['account'], queryFn: getAccount, enabled: me.isSuccess })

  const signOut = useMutation({
    mutationFn: logout,
    onSettled: () => {
      queryClient.clear()
      navigate('/login')
    },
  })

  if (me.isPending)
    return (
      <main className="page center-screen">
        <Logo />
      </main>
    )
  // Sin sesión: al iniciar sesión regresa a donde iba (p. ej. el link de un salón).
  if (me.isError)
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(location.pathname + location.search)}`} replace />

  return (
    <>
      <header className="topbar">
        <Link to="/app" className="brand" aria-label="Mis eventos">
          <Logo size={30} />
        </Link>
        <div className="topbar-user">
          {account.data?.isAdmin && (
            <Link to="/app/admin" className="small">
              Administración
            </Link>
          )}
          <span className="muted">{me.data.email}</span>
          <ThemeToggle />
          <button className="secondary small" onClick={() => signOut.mutate()} disabled={signOut.isPending}>
            Cerrar sesión
          </button>
        </div>
      </header>
      <Outlet />
    </>
  )
}
