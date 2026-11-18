import { useId } from 'react'

/** Contorno de sello de cera: círculo con bordes irregulares, generado una sola vez. */
const SEAL_PATH = (() => {
  const points: string[] = []
  const n = 72
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2
    // Ondas suaves + pequeñas irregularidades, como cera derramada.
    const r = 29 + Math.sin(a * 9) * 1.6 + Math.sin(a * 23 + 1.3) * 0.6
    points.push(`${(32 + Math.cos(a) * r).toFixed(2)},${(32 + Math.sin(a) * r).toFixed(2)}`)
  }
  return `M${points.join('L')}Z`
})()

/** Sello de lacre con la "L". */
export function Seal({ size = 36, className }: { size?: number; className?: string }) {
  const id = useId()
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" className={className} aria-hidden>
      <defs>
        <radialGradient id={`${id}-wax`} cx="38%" cy="32%" r="75%">
          <stop offset="0" stopColor="var(--seal-light)" />
          <stop offset="0.55" stopColor="var(--seal)" />
          <stop offset="1" stopColor="var(--seal-dark)" />
        </radialGradient>
      </defs>
      <path d={SEAL_PATH} fill={`url(#${id}-wax)`} />
      <circle cx="32" cy="32" r="19.5" fill="none" stroke="#f3dcc0" strokeOpacity="0.45" strokeWidth="1.4" />
      <circle cx="32" cy="32" r="16.5" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1" />
      <text
        x="32"
        y="41.5"
        textAnchor="middle"
        fontFamily="'Cormorant Garamond', Georgia, serif"
        fontSize="28"
        fontWeight="700"
        fill="#f6e7d2"
      >
        L
      </text>
    </svg>
  )
}

/** Logo completo: sello + "Lacre". */
export default function Logo({ size = 34 }: { size?: number }) {
  return (
    <span className="logo">
      <Seal size={size} />
      <span className="logo-word">Lacre</span>
    </span>
  )
}
