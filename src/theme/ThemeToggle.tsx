import { useTheme, type ThemePreference } from './useTheme'

const next: Record<ThemePreference, ThemePreference> = { system: 'light', light: 'dark', dark: 'system' }
const labels: Record<ThemePreference, string> = {
  system: 'Tema: automático',
  light: 'Tema: claro',
  dark: 'Tema: oscuro',
}

/** Botón que alterna entre automático → claro → oscuro. */
export default function ThemeToggle() {
  const { preference, setPreference } = useTheme()
  return (
    <button
      type="button"
      className="icon-button"
      onClick={() => setPreference(next[preference])}
      aria-label={`${labels[preference]}. Cambiar tema`}
      title={labels[preference]}
    >
      {preference === 'light' ? <SunIcon /> : preference === 'dark' ? <MoonIcon /> : <AutoIcon />}
    </button>
  )
}

const svg = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }

function SunIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg {...svg}>
      <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" />
    </svg>
  )
}

function AutoIcon() {
  return (
    <svg {...svg}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 3.5v17" />
      <path d="M12 3.5a8.5 8.5 0 0 1 0 17Z" fill="currentColor" stroke="none" />
    </svg>
  )
}
