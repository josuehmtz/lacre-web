import { useRef, useState } from 'react'
import { photoUrl, uploadPhoto } from '../api/photos'
import type { TemplateConfig } from '../templates/types'

/** Debe coincidir con Photos.MaxGallery del backend. */
export const MAX_GALLERY = 8

type Photos = TemplateConfig['photos']

interface Props {
  eventId: string
  photoBaseUrl: string | null
  photos: Photos
  onChange: (photos: Photos) => void
  galleryEnabled: boolean
  onGalleryEnabledChange: (enabled: boolean) => void
}

/** Portada y galería. Las fotos se suben al elegirlas; se quedan en la invitación al guardar el diseño. */
export default function PhotosEditor({ eventId, photoBaseUrl, photos, onChange, galleryEnabled, onGalleryEnabledChange }: Props) {
  const [busy, setBusy] = useState<'cover' | 'gallery' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const coverInput = useRef<HTMLInputElement>(null)
  const galleryInput = useRef<HTMLInputElement>(null)

  if (!photoBaseUrl)
    return <p className="muted small">La subida de fotos todavía no está disponible.</p>

  const run = async (slot: 'cover' | 'gallery', work: () => Promise<void>) => {
    setBusy(slot)
    setError(null)
    try {
      await work()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo subir la foto.')
    } finally {
      setBusy(null)
    }
  }

  const pickCover = (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    void run('cover', async () => {
      const { key } = await uploadPhoto(eventId, file)
      onChange({ ...photos, cover: key })
    })
  }

  const pickGallery = (files: FileList | null) => {
    if (!files?.length) return
    const room = MAX_GALLERY - photos.gallery.length
    const chosen = [...files].slice(0, room)
    void run('gallery', async () => {
      const added: string[] = []
      // Una por una: en celular con datos lentos es más estable que en paralelo.
      for (const file of chosen) added.push((await uploadPhoto(eventId, file)).key)
      onChange({ ...photos, gallery: [...photos.gallery, ...added] })
      if (files.length > room) setError(`Solo caben ${MAX_GALLERY} fotos en la galería; se agregaron las primeras ${room}.`)
    })
  }

  const move = (from: number, to: number) => {
    const gallery = [...photos.gallery]
    const [item] = gallery.splice(from, 1)
    gallery.splice(to, 0, item)
    onChange({ ...photos, gallery })
  }

  const cover = photoUrl(photoBaseUrl, photos.cover)

  return (
    <div className="photos-editor">
      <div className="photo-slot">
        <span className="photo-slot-label">Portada</span>
        {cover ? (
          <img src={cover} alt="Foto de portada" className="photo-thumb photo-thumb-cover" />
        ) : (
          <div className="photo-thumb photo-thumb-cover photo-empty" aria-hidden>Sin foto</div>
        )}
        <div className="photo-actions">
          <button type="button" className="secondary small" disabled={busy !== null} onClick={() => coverInput.current?.click()}>
            {busy === 'cover' ? 'Subiendo…' : cover ? 'Cambiar' : 'Elegir foto'}
          </button>
          {cover && (
            <button type="button" className="link small" disabled={busy !== null} onClick={() => onChange({ ...photos, cover: null })}>
              Quitar
            </button>
          )}
        </div>
        <input ref={coverInput} type="file" accept="image/*" hidden onChange={(e) => { pickCover(e.target.files); e.target.value = '' }} />
      </div>

      <label className="toggle">
        <input type="checkbox" checked={galleryEnabled} onChange={(e) => onGalleryEnabledChange(e.target.checked)} />
        Galería de fotos ({photos.gallery.length}/{MAX_GALLERY})
      </label>
      {galleryEnabled && (
        <div className="nested">
          {photos.gallery.length > 0 && (
            <ul className="photo-grid">
              {photos.gallery.map((key, i) => (
                <li key={key}>
                  <img src={photoUrl(photoBaseUrl, key)!} alt={`Foto ${i + 1} de la galería`} className="photo-thumb" loading="lazy" />
                  <div className="photo-grid-actions">
                    <button type="button" className="secondary small" aria-label="Mover antes" disabled={i === 0} onClick={() => move(i, i - 1)}>
                      ←
                    </button>
                    <button type="button" className="danger small" aria-label="Quitar foto"
                      onClick={() => onChange({ ...photos, gallery: photos.gallery.filter((k) => k !== key) })}>
                      ✕
                    </button>
                    <button type="button" className="secondary small" aria-label="Mover después" disabled={i === photos.gallery.length - 1} onClick={() => move(i, i + 1)}>
                      →
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {photos.gallery.length < MAX_GALLERY && (
            <button type="button" className="secondary small" disabled={busy !== null} onClick={() => galleryInput.current?.click()}>
              {busy === 'gallery' ? 'Subiendo…' : 'Agregar fotos'}
            </button>
          )}
          <input ref={galleryInput} type="file" accept="image/*" multiple hidden onChange={(e) => { pickGallery(e.target.files); e.target.value = '' }} />
        </div>
      )}

      {error && <p className="error small">{error}</p>}
      <p className="muted small">Las fotos se optimizan automáticamente. Recuerda guardar para que aparezcan en la invitación.</p>
    </div>
  )
}
