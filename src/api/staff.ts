import { api, ApiError, send } from './client'
import type { RsvpStatus } from './invitations'

// --- El cliente administra los accesos de hostess de su evento ---

export interface StaffAccess {
  id: string
  label: string
  expiresAt: string
  createdAt: string
  checkIns: number
}

/** El PIN solo viene al crear el acceso; después no se puede volver a consultar. */
export interface CreatedStaffAccess {
  id: string
  label: string
  expiresAt: string
  pin: string
}

const base = (eventId: string) => `/events/${eventId}/staff`

export const getStaffAccesses = (eventId: string) => api<StaffAccess[]>(base(eventId))
export const createStaffAccess = (eventId: string, label: string) =>
  send<CreatedStaffAccess>('POST', base(eventId), { label })
export const deleteStaffAccess = (eventId: string, id: string) => send<void>('DELETE', `${base(eventId)}/${id}`)

export const staffUrl = (accessId: string) => `${window.location.origin}/staff/${accessId}`

// --- Lo que usa la hostess el día del evento ---

export interface StaffSession {
  accessId: string
  label: string
  eventTitle: string
  startsAt: string
  venueName: string | null
  confirmedPasses: number
  checkedIn: number
  expiresAt: string
}

export interface CheckInEntry {
  id: string
  count: number
  at: string
  staffLabel: string | null
  /** Registrada sin conexión y todavía no sincronizada (solo existe en este celular). */
  pending?: boolean
}

export interface GuestSeat {
  name: string
  tableNumber: number | null
}

export interface ScanResult {
  /** Vacío cuando el resultado salió de la lista guardada y se buscó por nombre (sin conexión). */
  token: string
  invitationId: string
  displayName: string
  passes: number
  rsvpStatus: RsvpStatus
  confirmedPasses: number
  checkedIn: number
  remaining: number
  tables: number[]
  guests: GuestSeat[]
  warnings: string[]
  checkIns: CheckInEntry[]
  /** Resultado armado con la lista guardada en el celular, sin consultar al servidor. */
  offline?: boolean
}

export interface SearchResult {
  /** Sin conexión no hay token (la lista guarda solo su huella): se usa invitationId. */
  token: string | null
  invitationId?: string
  displayName: string
  passes: number
  rsvpStatus: RsvpStatus
  checkedIn: number
}

/** Invitación tal como se guarda en el celular para el modo sin conexión. */
export interface OfflineInvitation {
  id: string
  /** SHA-256 del token: reconoce el QR sin guardar el link de la invitación. */
  tokenHash: string
  displayName: string
  passes: number
  rsvpStatus: RsvpStatus
  confirmedPasses: number
  guests: GuestSeat[]
  checkIns: CheckInEntry[]
}

export interface OfflineSnapshot {
  generatedAt: string
  session: StaffSession
  invitations: OfflineInvitation[]
}

export interface QueuedCheckIn {
  id: string
  invitationId: string
  count: number
  at: string
}

export type SyncStatus = 'applied' | 'exceeded' | 'duplicate' | 'notFound' | 'invalid'

/**
 * En la puerta, una señal débil no debe dejar a la hostess esperando: si el servidor no responde en
 * unos segundos se usa la lista guardada. Las consultas son pequeñas (≈1 KB), así que 6 s sobra con 3G.
 */
const STAFF_TIMEOUT_MS = 6000

const staffApi = <T>(path: string, method = 'GET', body?: unknown) =>
  api<T>(path, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: AbortSignal.timeout(STAFF_TIMEOUT_MS),
  })

/** Falló la red (sin señal, tiempo agotado o el proxy no alcanzó al servidor), no la regla de negocio. */
export function isNetworkError(err: unknown): boolean {
  if (err instanceof ApiError) return err.status === 502 || err.status === 503 || err.status === 504
  if (err instanceof DOMException) return err.name === 'TimeoutError' || err.name === 'AbortError'
  return err instanceof TypeError
}

export const staffLogin = (accessId: string, pin: string) => staffApi<void>('/staff/login', 'POST', { accessId, pin })
export const staffLogout = () => staffApi<void>('/staff/logout', 'POST')
export const getStaffSession = () => staffApi<StaffSession>('/staff/me')
export const scanCode = (content: string) => staffApi<ScanResult>('/staff/scan', 'POST', { content })
export const checkIn = (token: string, count: number) => staffApi<ScanResult>('/staff/checkins', 'POST', { token, count })
export const undoCheckIn = (id: string) => staffApi<ScanResult>(`/staff/checkins/${id}`, 'DELETE')
export const searchInvitations = (q: string) => staffApi<SearchResult[]>(`/staff/search?q=${encodeURIComponent(q)}`)
export const getOfflineSnapshot = () =>
  // La lista completa tarda más que una consulta: más margen.
  api<OfflineSnapshot>('/staff/snapshot', { signal: AbortSignal.timeout(20_000) })
export const syncCheckIns = (checkIns: QueuedCheckIn[]) =>
  api<{ results: { id: string; status: SyncStatus }[] }>('/staff/sync', {
    method: 'POST',
    body: JSON.stringify({ checkIns }),
    signal: AbortSignal.timeout(20_000),
  })
