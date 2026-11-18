import { api, send } from './client'

export interface Credentials {
  email: string
  password: string
}

export interface Me {
  email: string
  isEmailConfirmed: boolean
}

export const register = (c: Credentials) => send<void>('POST', '/auth/register', c)

export const login = (c: Credentials) => send<void>('POST', '/auth/login?useCookies=true', c)

export const logout = () => send<void>('POST', '/auth/logout')

export const getMe = () => api<Me>('/auth/manage/info')

/** Proveedores de inicio de sesión configurados en el servidor. */
export const getProviders = () => api<{ google: boolean }>('/auth/providers')

/** Inicio de sesión con Google: es una navegación completa (no fetch), Google redirige de regreso. */
export const googleLoginUrl = (returnUrl = '/app') => `/api/auth/google?returnUrl=${encodeURIComponent(returnUrl)}`
