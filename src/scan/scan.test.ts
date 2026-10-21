import { describe, expect, it } from 'vitest'
import { createSeedProject } from '../core/project'
import { DemoSimulatedScanAdapter } from './demo-adapter'
import { createDemoScanDocument } from './demo-fixture'
import {
  applyScanDocument,
  correctMeasurement,
  parseScanDocument,
  ScanFormatError,
} from './document'

describe('Scan-Datenschnittstelle', () => {
  it('parst den gekennzeichneten Demo-Datensatz und wendet plausible Maße an', async () => {
    const project = createSeedProject()
    const adapter = new DemoSimulatedScanAdapter()
    expect(adapter.info.demo).toBe(true)
    expect(adapter.info.origin).toBe('demo-simulated')
    expect(await adapter.isAvailable()).toBe(true)

    const document = await adapter.collect(project, new AbortController().signal)
    expect(document.demo).toBe(true)
    expect(document.demoLabel).toMatch(/DEMO/)
    expect(document.notes.join(' ')).toMatch(/kein Zugriff auf Kamera/i)

    const result = applyScanDocument(project, document, '2026-03-12T10:00:00.000Z')
    expect(result.applied).toBe(9)
    expect(result.unmatched).toEqual([])
    expect(result.issues.filter((issue) => issue.severity === 'error')).toEqual([])
    expect(result.project.room.dimensions.width).toEqual({
      valueM: 5.18,
      uncertaintyM: 0.03,
      source: 'scan',
      updatedAt: '2026-03-12T10:00:00.000Z',
    })
    expect(result.project.furniture[0].dimensions.width.valueM).toBe(2.12)
    expect(result.project.furniture[0].dimensions.width.source).toBe('scan')
    expect(result.project.lastScan).toMatchObject({
      demo: true,
      origin: 'demo-simulated',
      adapterId: 'demo-simulated-living-room',
    })
  })

  it('korrigiert Scanmaße manuell und setzt die Quelle zurück', () => {
    const applied = applyScanDocument(createSeedProject(), createDemoScanDocument()).project
    const corrected = correctMeasurement(
      applied,
      { type: 'room' },
      'width',
      5.2,
      0.01,
      'manual',
      '2026-03-12T11:00:00.000Z',
    )
    expect(corrected.room.dimensions.width.source).toBe('manual')
    expect(corrected.room.dimensions.width.valueM).toBe(5.2)
    expect(applied.room.dimensions.width.source).toBe('scan')
  })

  it('blockiert geometrisch unmögliche Möbelmaße ohne Anwendung', () => {
    const document = createDemoScanDocument()
    document.drafts.push({
      target: { type: 'furniture-kind', kind: 'sofa', index: 0 },
      dimension: 'width',
      measurement: {
        valueM: 9.5,
        uncertaintyM: 0.02,
        source: 'scan',
        updatedAt: document.capturedAt,
      },
    })
    const result = applyScanDocument(createSeedProject(), document)
    expect(result.applied).toBe(0)
    expect(result.issues.some((issue) => issue.severity === 'error')).toBe(true)
    expect(result.project.room.dimensions.width.valueM).toBe(5.2)
  })

  it('weist Scan-JSON ohne Schema oder mit Kamera-Behauptung als Demo ohne Flag zurück', () => {
    expect(() => parseScanDocument('{oops')).toThrow(ScanFormatError)
    const invalid = createDemoScanDocument()
    invalid.demo = false
    expect(() => parseScanDocument(JSON.stringify(invalid))).toThrow(/demo/)
  })
})
