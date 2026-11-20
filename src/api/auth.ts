import { api, ApiError, send } from './client'

export interface Credentials {
  email: string
  password: string
}

export interface Me {
  email: string
  isEmailConfirmed: boolean
}

export const register = (c: Credentials) => send<void>('POST', '/auth/register', c)

/** Identity responde 401 con "Failed", "LockedOut" o "NotAllowed": se traduce para el usuario. */
const loginErrors: Record<string, string> = {
  LockedOut: 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.',
  NotAllowed: 'Tu cuenta aún no puede iniciar sesión.',
}

export async function login(c: Credentials) {
  try {
    await send<void>('POST', '/auth/login?useCookies=true', c)
  } catch (e) {
    if (e instanceof ApiError && e.status === 401)
      throw new ApiError(401, loginErrors[e.message] ?? 'Correo o contraseña incorrectos.')
    throw e
  }
}

export const logout = () => send<void>('POST', '/auth/logout')

export const getMe = () => api<Me>('/auth/manage/info')

/** Proveedores de inicio de sesión configurados en el servidor. */
export const getProviders = () => api<{ google: boolean }>('/auth/providers')

/** Inicio de sesión con Google: es una navegación completa (no fetch), Google redirige de regreso. */
export const googleLoginUrl = (returnUrl = '/app') => `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
