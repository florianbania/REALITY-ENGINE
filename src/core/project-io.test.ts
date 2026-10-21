import { describe, expect, it } from 'vitest'
import { createSeedProject } from './project'
import { exportProject, importProject, ProjectFormatError } from './project-io'

describe('Projekt Import und Export', () => {
  it('führt einen verlustfreien JSON-Roundtrip aus', () => {
    const project = createSeedProject()
    const serialized = exportProject(project)
    const imported = importProject(serialized)

    expect(imported).toEqual(project)
    expect(serialized).toContain('"schemaVersion": 4')
  })

  it('migriert Phase-1-Projekte ohne erfundene Messwerte', () => {
    const legacy = createSeedProject() as unknown as Record<string, unknown>
    const furniture = (legacy.furniture as Array<Record<string, unknown>>).map((item) => {
      const rest = { ...item }
      delete rest.orientation
      delete rest.minimumClearanceM
      return { ...rest, rotationYDeg: 45 }
    })
    const v1 = {
      ...legacy,
      schemaVersion: 1,
      furniture,
    } as Record<string, unknown>
    delete v1.doors
    delete v1.sun
    delete v1.openings
    const imported = importProject(JSON.stringify(v1))
    expect(imported.schemaVersion).toBe(4)
    expect(imported.lastScan).toBeNull()
    expect(imported.openings).toEqual([])
    expect(imported.doors).toEqual([])
    expect(imported.sun.timeZone).toBe('UTC')
    expect(imported.sun.latitude).toBe(0)
    expect(imported.furniture[0].orientation).toEqual({
      rotationYDeg: 45,
      tiltXDeg: 0,
      tiltZDeg: 0,
    })
    expect(imported.furniture[0].minimumClearanceM).toBe(0.05)
  })

  it('weist beschädigtes JSON mit verständlichem Fehler zurück', () => {
    expect(() => importProject('{oops')).toThrow(ProjectFormatError)
    try {
      importProject('{oops')
    } catch (error) {
      expect((error as ProjectFormatError).issues[0]).toMatch(/gültiges JSON/)
    }
  })

  it('weist unbekannte künftige Schemaversionen zurück', () => {
    const future = { ...createSeedProject(), schemaVersion: 5 }
    expect(() => importProject(JSON.stringify(future))).toThrow(/nicht unterstützt/)
  })

  it('validiert verschachtelte Messwerte und Positionen', () => {
    const invalid = createSeedProject()
    invalid.room.dimensions.width.valueM = -1
    invalid.furniture[0].position.xM = Number.NaN
    const serialized = JSON.stringify(invalid)

    expect(() => importProject(serialized)).toThrow(ProjectFormatError)
  })
})
