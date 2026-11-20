/**
 * Convierte un teléfono mexicano a formato internacional para wa.me (solo dígitos).
 * 10 dígitos → se antepone 52. Si ya trae lada de país, se respeta.
 */
export function toWhatsAppNumber(phone: string | null | undefined): string | null {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 10) return `52${digits}`
  if (digits.length >= 11 && digits.length <= 15) return digits
  return null
}

const shortDate = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' })

/** Primer envío: la invitación. */
export const invitationMessage = (displayName: string, eventTitle: string, url: string) =>
  `¡Hola ${displayName}! Te compartimos tu invitación a "${eventTitle}": ${url}`

/** Recordatorio para quien ya la recibió y no ha confirmado. */
export const reminderMessage = (displayName: string, eventTitle: string, url: string, deadline: string) =>
  `¡Hola ${displayName}! Te recordamos confirmar tu asistencia a "${eventTitle}" antes del ${shortDate.format(new Date(deadline))}. Aquí está tu invitación: ${url}`

/** Link que abre WhatsApp con el mensaje ya escrito (gratis, sin API). */
export function whatsAppLink(phone: string | null | undefined, text: string): string | null {
  const number = toWhatsAppNumber(phone)
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(text)}` : null
}
