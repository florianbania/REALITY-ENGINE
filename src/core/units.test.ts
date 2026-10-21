import { describe, expect, it } from 'vitest'
import { clampPrecision, formatLength, fromMeters, toMeters } from './units'

describe('SI-Einheiten', () => {
  it('konvertiert Zentimeter und Millimeter verlustarm in Meter', () => {
    expect(toMeters(275, 'cm')).toBeCloseTo(2.75)
    expect(toMeters(1250, 'mm')).toBeCloseTo(1.25)
    expect(fromMeters(4.2, 'cm')).toBeCloseTo(420)
  })

  it('formatiert Längen für die deutsche Oberfläche', () => {
    expect(formatLength(2.755, 'm')).toBe('2,76 m')
    expect(formatLength(1.2, 'cm')).toBe('120 cm')
  })

  it('weist nicht-endliche Eingaben zurück', () => {
    expect(() => toMeters(Number.NaN, 'cm')).toThrow(TypeError)
    expect(() => fromMeters(Number.POSITIVE_INFINITY, 'm')).toThrow(TypeError)
  })

  it('begrenzt Gleitkommaartefakte an Systemgrenzen', () => {
    expect(clampPrecision(0.1 + 0.2)).toBe(0.3)
  })
})
