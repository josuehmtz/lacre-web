import { api, send } from './client'

export type RsvpStatus = 'Pending' | 'Confirmed' | 'Declined'

export const rsvpLabels: Record<RsvpStatus, string> = {
  Pending: 'Pendiente',
  Confirmed: 'Confirmado',
  Declined: 'No asistirá',
}

export interface Invitation {
  id: string
  displayName: string
  passes: number
  phone: string | null
  token: string
  rsvpStatus: RsvpStatus
  confirmedPasses: number
  respondedAt: string | null
  message: string | null
  guestNames: string[]
  /** Personas que ya entraron el día del evento (todas, con o sin nombre). */
  checkedIn: number
  /** Las que la hostess marcó por nombre. */
  arrivedNames: string[]
  /** Cuándo se mandó por WhatsApp (null = sin enviar). */
  sentAt: string | null
}

export interface ManualRsvp {
  attending: boolean
  confirmedPasses: number
  guestNames?: string[]
}

export interface SaveInvitation {
  displayName: string
  passes: number
  phone?: string | null
}

const base = (eventId: string) => `/events/${eventId}/invitations`

export const getInvitations = (eventId: string) => api<Invitation[]>(base(eventId))
export const createInvitation = (eventId: string, i: SaveInvitation) =>
  send<Invitation>('POST', base(eventId), i)
export const updateInvitation = (eventId: string, id: string, i: SaveInvitation) =>
  send<Invitation>('PUT', `${base(eventId)}/${id}`, i)
export const setRsvp = (eventId: string, id: string, rsvp: ManualRsvp) =>
  send<Invitation>('PUT', `${base(eventId)}/${id}/rsvp`, rsvp)
export const deleteInvitation =(eventId: string, id: string) =>
  send<void>('DELETE', `${base(eventId)}/${id}`)

/** Anota que la invitación ya se mandó por WhatsApp (o lo deshace si al final no salió). */
export const markSent = (eventId: string, id: string) => send<Invitation>('PUT', `${base(eventId)}/${id}/sent`)
export const unmarkSent = (eventId: string, id: string) => send<Invitation>('DELETE', `${base(eventId)}/${id}/sent`)

/** Link público de la invitación (el mismo que irá en el QR). */
export const invitationUrl = (token: string) => `${window.location.origin}/i/${token}`
