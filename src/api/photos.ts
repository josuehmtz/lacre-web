import { ApiError, send } from './client'

interface UploadTicket {
  uploadUrl: string
  key: string
  url: string
  expiresAt: string
}

/** Lado más largo de la foto al subirla: se ve nítida en celular y pesa ≈200–400 KB. */
const MAX_SIDE = 1600
const QUALITY = 0.82
/** Archivos más grandes ni se intentan abrir (fotos RAW, videos renombrados). */
const MAX_INPUT_BYTES = 25 * 1024 * 1024

/**
 * Sube una foto del evento: la reduce en el navegador, pide permiso a la API
 * y la manda directo a Cloudflare R2 (no pasa por nuestro servidor). Devuelve la llave para guardarla en el diseño.
 */
export async function uploadPhoto(eventId: string, file: File): Promise<{ key: string; url: string }> {
  if (!file.type.startsWith('image/')) throw new Error('Elige una imagen (JPG, PNG o WebP).')
  if (file.size > MAX_INPUT_BYTES) throw new Error('La imagen es demasiado grande (máximo 25 MB).')

  const blob = await shrink(file)
  const ticket = await send<UploadTicket>('POST', `/events/${eventId}/photos`, {
    contentType: blob.type,
    size: blob.size,
  })

  // Content-Type y tamaño van firmados en la URL: deben coincidir con lo que pedimos.
  const res = await fetch(ticket.uploadUrl, { method: 'PUT', body: blob, headers: { 'Content-Type': blob.type } })
  if (!res.ok) throw new ApiError(res.status, 'No se pudo subir la foto. Intenta de nuevo.')
  return { key: ticket.key, url: ticket.url }
}

/** Redimensiona y recomprime a WebP (o JPEG si el navegador no sabe generar WebP). */
async function shrink(file: File): Promise<Blob> {
  let bitmap: ImageBitmap
  try {
    // from-image: respeta la rotación EXIF de las fotos tomadas con el celular.
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    throw new Error('No pudimos leer esa imagen. Prueba con una foto JPG o PNG.')
  }

  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()

  const encode = (type: string) =>
    new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, QUALITY))

  // Safari viejo devuelve PNG cuando no soporta WebP: en ese caso usamos JPEG, que pesa mucho menos.
  const webp = await encode('image/webp')
  if (webp?.type === 'image/webp') return webp
  const jpeg = await encode('image/jpeg')
  if (jpeg) return jpeg
  throw new Error('No pudimos procesar esa imagen.')
}

/** URL pública de una foto guardada en el diseño. */
export const photoUrl = (base: string | null | undefined, key: string | null | undefined) =>
  base && key ? base + key : null
