import { describe, expect, it } from 'vitest'
import { createSeedProject } from '../core/project'
import { applyScanDocument, parseIncomingScan, ScanFormatError } from './document'
import fixture from './fixtures/roomplan-wohnzimmer.json'
import { convertRoomPlanLike, ROOMPLAN_DEFAULT_UNCERTAINTY_M } from './roomplan'

describe('RoomPlan-JSON-Dateiimport', () => {
  it('wandelt RoomPlan-ähnliches JSON in Scan-Entwürfe mit angenommener Unsicherheit', () => {
    const document = convertRoomPlanLike(fixture, '2026-04-02T16:00:00.000Z')
    expect(document.origin).toBe('file-import')
    expect(document.demo).toBe(false)
    expect(document.adapter.id).toBe('roomplan-json-file')
    expect(document.notes.join(' ')).toMatch(/Kein Live-Scan/)
    expect(document.notes.join(' ')).toMatch(/unimplementiertes Skelett/)
    expect(document.drafts[0].measurement.uncertaintyM).toBe(ROOMPLAN_DEFAULT_UNCERTAINTY_M)
    expect(document.drafts.find((item) => item.target.type === 'room' && item.dimension === 'width')?.measurement.valueM).toBe(5.16)
    expect(document.drafts.find((item) => item.target.type === 'room' && item.dimension === 'height')?.measurement.valueM).toBe(2.61)
    expect(
      document.drafts.some(
        (item) => item.target.type === 'furniture-kind' && item.target.kind === 'sofa' && item.dimension === 'width' && item.measurement.valueM === 2.11,
      ),
    ).toBe(true)
    expect(document.notes.join(' ')).toMatch(/plant/)
    expect(document.poses).toHaveLength(2)
    expect(document.poses[0].position.xM).toBeCloseTo(0.15)
    expect(document.poses[0].position.yM).toBeCloseTo(0)
    expect(document.poses[0].derivedFrom).toBe('file-transform')
    expect(document.openingDrafts).toHaveLength(1)
    expect(document.openingDrafts[0].wall).toBe('west')
  })

  it('wendet den Dateiimport auf den Zwilling an und erlaubt Korrektur', () => {
    const document = parseIncomingScan(JSON.stringify(fixture))
    const result = applyScanDocument(createSeedProject(), document, '2026-04-02T16:00:00.000Z')
    expect(result.applied).toBeGreaterThan(0)
    expect(result.project.lastScan?.origin).toBe('file-import')
    expect(result.project.lastScan?.demo).toBe(false)
    expect(result.project.room.dimensions.width.source).toBe('scan')
    expect(result.project.room.dimensions.width.valueM).toBe(5.16)
    expect(result.project.furniture[0].dimensions.width.valueM).toBe(2.11)
    expect(result.posesApplied).toBe(2)
    expect(result.project.furniture[0].position.xM).toBeCloseTo(0.15)
    expect(result.project.openings[0].wall).toBe('west')
    expect(result.project.openings[0].width.valueM).toBeCloseTo(1.42)
  })

  it('weist Dateien ohne Raumhülle zurück', () => {
    expect(() => convertRoomPlanLike({ objects: [] })).toThrow(ScanFormatError)
  })
})
