import { describe, expect, it } from 'vitest'
import { createSeedProject, updateFurnitureMeasurement, updateRoomMeasurement } from './project'

describe('versionierter digitaler Zwilling', () => {
  it('erzeugt ein Projekt mit kanonischem Schema und metrischen Messwerten', () => {
    const project = createSeedProject()

    expect(project.schema).toBe('reality-engine/project')
    expect(project.schemaVersion).toBe(2)
    expect(project.doors).toHaveLength(1)
    expect(project.sun.timeZone).toBe('Europe/Berlin')
    expect(project.room.dimensions.width.valueM).toBe(5.2)
    expect(project.room.dimensions.width.source).toBe('manual')
    expect(project.room.dimensions.width.uncertaintyM).toBe(0.01)
  })

  it('ändert Raummesswerte unveränderlich und aktualisiert Provenienz', () => {
    const project = createSeedProject()
    const changedAt = '2026-03-01T10:00:00.000Z'
    const next = updateRoomMeasurement(project, 'width', 6.4, 0.005, 'scan', changedAt)

    expect(next).not.toBe(project)
    expect(next.room).not.toBe(project.room)
    expect(next.room.dimensions.width).toEqual({
      valueM: 6.4,
      uncertaintyM: 0.005,
      source: 'scan',
      updatedAt: changedAt,
    })
    expect(project.room.dimensions.width.valueM).toBe(5.2)
    expect(next.updatedAt).toBe(changedAt)
  })

  it('ändert gezielt Möbelmaße und erhält alle übrigen Objekte', () => {
    const project = createSeedProject()
    const target = project.furniture[0]
    const untouched = project.furniture[1]
    const next = updateFurnitureMeasurement(
      project,
      target.id,
      'depth',
      1.05,
      0.02,
      'manual',
      '2026-02-02T00:00:00.000Z',
    )

    expect(next.furniture[0].dimensions.depth.valueM).toBe(1.05)
    expect(next.furniture[1]).toBe(untouched)
    expect(project.furniture[0].dimensions.depth.valueM).toBe(0.9)
    expect(next.furniture[0].orientation.tiltXDeg).toBe(0)
  })

  it('verhindert unmögliche Messwerte und unbekannte Ziele', () => {
    const project = createSeedProject()
    expect(() => updateRoomMeasurement(project, 'height', 0, 0.01, 'manual')).toThrow(
      RangeError,
    )
    expect(() =>
      updateFurnitureMeasurement(project, 'nicht-vorhanden', 'width', 1, 0.01, 'manual'),
    ).toThrow(/nicht gefunden/)
  })
})
