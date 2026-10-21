export type DisplayUnit = 'm' | 'cm' | 'mm'

const METERS_PER_UNIT: Record<DisplayUnit, number> = {
  m: 1,
  cm: 0.01,
  mm: 0.001,
}

export function toMeters(value: number, unit: DisplayUnit): number {
  assertFinite(value)
  return value * METERS_PER_UNIT[unit]
}

export function fromMeters(valueM: number, unit: DisplayUnit): number {
  assertFinite(valueM)
  return valueM / METERS_PER_UNIT[unit]
}

export function formatLength(valueM: number, unit: DisplayUnit = 'm'): string {
  const value = fromMeters(valueM, unit)
  const maximumFractionDigits = unit === 'm' ? 2 : unit === 'cm' ? 1 : 0
  return `${new Intl.NumberFormat('de-DE', { maximumFractionDigits }).format(value)} ${unit}`
}

export function clampPrecision(value: number, decimals = 4): number {
  const factor = 10 ** decimals
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function assertFinite(value: number): void {
  if (!Number.isFinite(value)) {
    throw new TypeError('Längenwerte müssen endlich sein.')
  }
}
