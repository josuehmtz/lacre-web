import type {
  CheckInEntry,
  OfflineInvitation,
  OfflineSnapshot,
  QueuedCheckIn,
  ScanResult,
  SearchResult,
  StaffSession,
} from '../api/staff'

/*
 * Modo sin conexión de la hostess. La lista del evento y las entradas pendientes se guardan en este celular
 * (localStorage, por acceso). Las reglas imitan a las del backend (Domain/Staff.cs) para que la hostess vea
 * lo mismo con o sin señal.
 */

const key = (accessId: string, kind: 'snapshot' | 'queue') => `lacre.staff.${accessId}.${kind}`

function read<T>(k: string): T | null {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function write(k: string, value: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(value))
  } catch {
    // Navegación privada o almacenamiento lleno: el modo sin conexión no estará disponible, lo demás sigue igual.
  }
}

export const loadSnapshot = (accessId: string) => read<OfflineSnapshot>(key(accessId, 'snapshot'))
export const saveSnapshot = (accessId: string, s: OfflineSnapshot) => write(key(accessId, 'snapshot'), s)
export const loadQueue = (accessId: string) => read<QueuedCheckIn[]>(key(accessId, 'queue')) ?? []
export const saveQueue = (accessId: string, q: QueuedCheckIn[]) => write(key(accessId, 'queue'), q)

/** Al cerrar sesión se borra la lista del celular, salvo entradas sin sincronizar (no se pierden). */
export function clearOfflineData(accessId: string) {
  try {
    localStorage.removeItem(key(accessId, 'snapshot'))
    if (loadQueue(accessId).length === 0) localStorage.removeItem(key(accessId, 'queue'))
  } catch {
    // Sin almacenamiento no hay nada que borrar.
  }
}

/** Misma huella que CheckInRules.TokenHash del backend. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Igual que CheckInRules.TokenFromQr: el QR trae el link /i/{token} (o el token solo). */
export function tokenFromQr(content: string): string | null {
  const text = content.trim()
  if (!text) return null
  try {
    const url = new URL(text)
    const segments = url.pathname.replace(/^\/+|\/+$/g, '').split('/')
    return segments.length === 2 && segments[0] === 'i' ? segments[1] : null
  } catch {
    return /^[A-Za-z0-9_-]{16,64}$/.test(text) ? text : null
  }
}

function entriesFor(inv: OfflineInvitation, queue: QueuedCheckIn[]): CheckInEntry[] {
  // Si una sincronización llegó al servidor pero se perdió la respuesta, la entrada ya viene en la lista:
  // no se cuenta dos veces.
  const synced = new Set(inv.checkIns.map((c) => c.id))
  const pending = queue
    .filter((q) => q.invitationId === inv.id && !synced.has(q.id))
    .map((q) => ({ id: q.id, count: q.count, at: q.at, staffLabel: null, pending: true }))
  return [...inv.checkIns, ...pending].sort((a, b) => a.at.localeCompare(b.at))
}

/** Avisos iguales a CheckInRules.Warnings. */
function warningsFor(inv: OfflineInvitation, checkedIn: number): string[] {
  switch (inv.rsvpStatus) {
    case 'Pending':
      return ['Esta invitación no confirmó asistencia.']
    case 'Declined':
      return ['Esta invitación respondió que no asistiría.']
    case 'Confirmed':
      return checkedIn >= inv.confirmedPasses ? [`Ya entraron los ${inv.confirmedPasses} lugares confirmados.`] : []
    default:
      return []
  }
}

export function toScanResult(inv: OfflineInvitation, queue: QueuedCheckIn[], token = ''): ScanResult {
  const checkIns = entriesFor(inv, queue)
  const checkedIn = checkIns.reduce((s, c) => s + c.count, 0)
  const tables = [...new Set(inv.guests.map((g) => g.tableNumber).filter((n): n is number => n !== null))].sort((a, b) => a - b)
  return {
    token,
    invitationId: inv.id,
    displayName: inv.displayName,
    passes: inv.passes,
    rsvpStatus: inv.rsvpStatus,
    confirmedPasses: inv.confirmedPasses,
    checkedIn,
    remaining: Math.max(0, inv.passes - checkedIn),
    tables,
    guests: inv.guests,
    warnings: warningsFor(inv, checkedIn),
    checkIns,
    offline: true,
  }
}

export async function findByQr(snapshot: OfflineSnapshot, queue: QueuedCheckIn[], content: string): Promise<ScanResult | null> {
  const token = tokenFromQr(content)
  if (!token) return null
  const hash = await sha256Hex(token)
  const inv = snapshot.invitations.find((i) => i.tokenHash === hash)
  return inv ? toScanResult(inv, queue, token) : null
}

export function findById(snapshot: OfflineSnapshot, queue: QueuedCheckIn[], id: string): ScanResult | null {
  const inv = snapshot.invitations.find((i) => i.id === id)
  return inv ? toScanResult(inv, queue) : null
}

/** Sin acentos ni mayúsculas, como el ILIKE + unaccent del backend. */
const normalize = (s: string) => s.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase()

export function searchLocal(snapshot: OfflineSnapshot, queue: QueuedCheckIn[], q: string): SearchResult[] {
  const term = normalize(q.trim())
  if (term.length < 2) return []
  return snapshot.invitations
    .filter((i) => normalize(i.displayName).includes(term) || i.guests.some((g) => normalize(g.name).includes(term)))
    .slice(0, 20)
    .map((i) => {
      const r = toScanResult(i, queue)
      return { token: null, invitationId: i.id, displayName: i.displayName, passes: i.passes, rsvpStatus: i.rsvpStatus, checkedIn: r.checkedIn }
    })
}

/** Encabezado de la estación armado con la lista guardada más lo que está pendiente de subir. */
export function sessionFrom(snapshot: OfflineSnapshot, queue: QueuedCheckIn[]): StaffSession {
  const known = new Set(snapshot.invitations.map((i) => i.id))
  const synced = new Set(snapshot.invitations.flatMap((i) => i.checkIns.map((c) => c.id)))
  const pending = queue.filter((q) => known.has(q.invitationId) && !synced.has(q.id)).reduce((s, q) => s + q.count, 0)
  return { ...snapshot.session, checkedIn: snapshot.session.checkedIn + pending }
}

export function newQueuedCheckIn(invitationId: string, count: number): QueuedCheckIn {
  return { id: crypto.randomUUID(), invitationId, count, at: new Date().toISOString() }
}
