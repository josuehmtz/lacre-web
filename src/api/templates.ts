import type { StoredConfig, TemplateConfig, TemplateKey } from '../templates/types'
import { api, send } from './client'

export interface SavedTemplate {
  templateKey: TemplateKey
  config: StoredConfig
  /** Base pública de las fotos (R2), o null si la subida de fotos no está configurada. */
  photoBaseUrl: string | null
}

export const getTemplateConfig = (eventId: string) => api<SavedTemplate>(`/events/${eventId}/template`)

export const saveTemplateConfig = (eventId: string, templateKey: TemplateKey, config: TemplateConfig) =>
  send<SavedTemplate>('PUT', `/events/${eventId}/template`, { templateKey, config })
