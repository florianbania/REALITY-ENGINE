import { describe, expect, it } from 'vitest'
import { createSeedProject } from '../core/project'
import {
  addLocalMinutes,
  calculateSun,
  calculateSunForProject,
  localDateTimeToInstant,
  openingReceivesDirectSun,
} from './sun'

describe('SUN-Astronomie', () => {
  const berlinSummer = {
    latitude: 52.52,
    longitude: 13.405,
    timeZone: 'Europe/Berlin',
    northOffsetDeg: 0,
    localDateTime: '2026-06-21T14:00',
  }

  it('berechnet Sonnenstand für Standort, Datum, Uhrzeit und DST', () => {
    const result = calculateSun(berlinSummer)
    expect(result.isAboveHorizon).toBe(true)
    expect(result.altitudeDeg).toBeGreaterThan(40)
    expect(result.altitudeDeg).toBeLessThan(70)
    expect(result.azimuthNorthDeg).toBeGreaterThan(180)
    expect(result.azimuthNorthDeg).toBeLessThan(280)
    expect(result.localLabel).toContain('14:00')
    expect(result.zoneLabel).toMatch(/CEST|GMT\+2|\+02/)
    expect(result.sceneDirection.y).toBeGreaterThan(0)
    expect(result.sunriseLabel).toMatch(/^\d{2}:\d{2}$/)
    expect(result.sunsetLabel).toMatch(/^\d{2}:\d{2}$/)
    expect(result.roomNorthAxis).toEqual({ x: 0, y: 0, z: -1 })
  })

  it('markiert Westfenster am Nachmittag geometrisch, ohne Wetter zu erfinden', () => {
    const project = createSeedProject()
    const result = calculateSunForProject(project)
    expect(result.isAboveHorizon).toBe(true)
    expect(openingReceivesDirectSun('west', result)).toBe(true)
    expect(openingReceivesDirectSun('east', result)).toBe(false)
    expect(result.illuminatedOpeningIds).toEqual([project.openings[0].id])
  })

  it('beleuchtet keine Öffnung unter dem Horizont', () => {
    const night = calculateSun({
      ...berlinSummer,
      localDateTime: '2026-06-21T00:30',
    })
    expect(night.isAboveHorizon).toBe(false)
    expect(openingReceivesDirectSun('west', night)).toBe(false)
  })

  it('weist fehlende lokale Zeiten in der DST-Lücke zurück', () => {
    expect(() => localDateTimeToInstant('2026-03-29T02:30', 'Europe/Berlin')).toThrow(
      /Zeitumstellung/,
    )
  })

  it('animiert den Tagesverlauf über lokale Minuten, auch über Mitternacht', () => {
    expect(addLocalMinutes('2026-06-21T14:00', 15)).toBe('2026-06-21T14:15')
    expect(addLocalMinutes('2026-06-21T23:50', 15)).toBe('2026-06-22T00:05')
  })

  it('weist ungültige Koordinaten und Zeitzonen zurück', () => {
    expect(() => calculateSun({ ...berlinSummer, latitude: 91 })).toThrow(RangeError)
    expect(() => calculateSun({ ...berlinSummer, timeZone: 'Mars/Olympus' })).toThrow(
      RangeError,
    )
  })
})
