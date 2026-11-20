import { useEffect, useState } from 'react'

/** Konva dibuja en canvas y no entiende variables CSS: leemos los colores del tema actual. */
export interface ThemeColors {
  bg: string
  surface: string
  border: string
  text: string
  muted: string
  accent: string
  accentSoft: string
  ok: string
  error: string
  /** Colores propios del plano: contrastan con la página en ambos temas. */
  floor: string
  grid: string
  wall: string
  table: string
  seat: string
}

function read(): ThemeColors {
  const s = getComputedStyle(document.documentElement)
  const v = (name: string) => s.getPropertyValue(name).trim()
  return {
    bg: v('--bg'),
    surface: v('--surface'),
    border: v('--border'),
    text: v('--text'),
    muted: v('--text-muted'),
    accent: v('--accent'),
    accentSoft: v('--accent-soft'),
    ok: v('--ok'),
    error: v('--error'),
    floor: v('--plan-floor'),
    grid: v('--plan-grid'),
    wall: v('--plan-wall'),
    table: v('--plan-table'),
    seat: v('--plan-seat'),
  }
}

export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState(read)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const update = () => setColors(read())
    mq.addEventListener('change', update)
    // También cuando el usuario cambia el tema con el botón (html[data-theme]).
    const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    return () => {
      mq.removeEventListener('change', update)
      observer.disconnect()
    }
  }, [])
  return colors
}
