import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, Navigate, Outlet, useNavigate } from 'react-router'
import { getMe, logout } from '../api/auth'
import ThemeToggle from '../theme/ThemeToggle'
import Logo from './brand/Logo'

/** Marco del panel del cliente: exige sesión y muestra la barra superior. */
export default function AppLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const me = useQuery({ queryKey: ['me'], queryFn: getMe })

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
  if (me.isError) return <Navigate to="/login" replace />

  return (
    <>
      <header className="topbar">
        <Link to="/app" className="brand" aria-label="Mis eventos">
          <Logo size={30} />
        </Link>
        <div className="topbar-user">
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
