import { describe, expect, it } from 'vitest'
import { createSeedProject } from './project'
import { exportProject, importProject, ProjectFormatError } from './project-io'

describe('Projekt Import und Export', () => {
  it('führt einen verlustfreien JSON-Roundtrip aus', () => {
    const project = createSeedProject()
    const serialized = exportProject(project)
    const imported = importProject(serialized)

    expect(imported).toEqual(project)
    expect(serialized).toContain('"schemaVersion": 1')
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
    const future = { ...createSeedProject(), schemaVersion: 2 }
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
