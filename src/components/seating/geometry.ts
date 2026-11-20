import type { TableShape } from '../../api/seating'

/** Tamaño de una mesa en unidades del plano, según forma y lugares. */
export function tableSize(shape: TableShape, capacity: number): { width: number; height: number } {
  switch (shape) {
    case 'Round': {
      const d = 52 + capacity * 4.4
      return { width: d, height: d }
    }
    case 'Square': {
      const s = 48 + Math.ceil(capacity / 4) * 22
      return { width: s, height: s }
    }
    case 'Rectangle':
      return { width: 40 + Math.ceil(capacity / 2) * 26, height: 56 }
  }
}

/** Posiciones de las sillas (relativas al centro de la mesa). */
export function seatPositions(shape: TableShape, capacity: number): { x: number; y: number }[] {
  const { width, height } = tableSize(shape, capacity)
  const gap = 11
  if (shape === 'Round') {
    const r = width / 2 + gap
    return Array.from({ length: capacity }, (_, i) => {
      const a = (i / capacity) * Math.PI * 2 - Math.PI / 2
      return { x: Math.cos(a) * r, y: Math.sin(a) * r }
    })
  }

  if (shape === 'Rectangle') {
    // Sillas en los dos lados largos.
    const top = Math.ceil(capacity / 2)
    const bottom = capacity - top
    const row = (n: number, y: number) =>
      Array.from({ length: n }, (_, i) => ({ x: -width / 2 + ((i + 0.5) * width) / n, y }))
    return [...row(top, -height / 2 - gap), ...row(bottom, height / 2 + gap)]
  }

  // Cuadrada: repartidas en los cuatro lados.
  const perSide = [0, 0, 0, 0]
  for (let i = 0; i < capacity; i++) perSide[i % 4]++
  const half = width / 2
  const side = (n: number, fn: (t: number) => { x: number; y: number }) =>
    Array.from({ length: n }, (_, i) => fn(-half + ((i + 0.5) * width) / n))
  return [
    ...side(perSide[0], (t) => ({ x: t, y: -half - gap })),
    ...side(perSide[1], (t) => ({ x: half + gap, y: t })),
    ...side(perSide[2], (t) => ({ x: -t, y: half + gap })),
    ...side(perSide[3], (t) => ({ x: -half - gap, y: -t })),
  ]
}

/** Mantiene un punto dentro del salón dejando un margen. */
export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/**
 * Pega la entrada a la pared más cercana a (x, y) y la gira para que su "adentro" (+y local) apunte al salón.
 * Rotaciones: arriba 0°, derecha 90°, abajo 180°, izquierda 270°.
 */
export function snapToWall(
  room: { width: number; height: number },
  width: number,
  depth: number,
  x: number,
  y: number,
): { x: number; y: number; rotation: number } {
  const along = (v: number, max: number) => clamp(v, Math.min(width / 2, max / 2), Math.max(max - width / 2, max / 2))
  const walls = [
    { dist: y, place: () => ({ x: along(x, room.width), y: depth / 2, rotation: 0 }) },
    { dist: room.height - y, place: () => ({ x: along(x, room.width), y: room.height - depth / 2, rotation: 180 }) },
    { dist: x, place: () => ({ x: depth / 2, y: along(y, room.height), rotation: 270 }) },
    { dist: room.width - x, place: () => ({ x: room.width - depth / 2, y: along(y, room.height), rotation: 90 }) },
  ]
  return walls.reduce((best, w) => (w.dist < best.dist ? w : best)).place()
}
