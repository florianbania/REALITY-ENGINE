import { SCAN_SCHEMA, SCAN_SCHEMA_VERSION, type ScanDocument } from './contracts'

const CAPTURED_AT = '2026-03-12T09:40:00.000Z'

function scanMeasure(valueM: number, uncertaintyM: number) {
  return {
    valueM,
    uncertaintyM,
    source: 'scan' as const,
    updatedAt: CAPTURED_AT,
  }
}

/**
 * Realistic living-room envelope and furniture bounds for tests and the
 * labelled demo importer. Values are authored fixtures, not a device capture.
 */
export function createDemoScanDocument(): ScanDocument {
  return {
    schema: SCAN_SCHEMA,
    schemaVersion: SCAN_SCHEMA_VERSION,
    id: 'scan-demo-wohnzimmer-2026-03-12',
    origin: 'demo-simulated',
    demo: true,
    demoLabel: 'DEMO-SIMULATION — kein Gerätescan',
    capturedAt: CAPTURED_AT,
    adapter: {
      id: 'demo-simulated-living-room',
      name: 'Simulierter Wohnzimmer-Scan (Demo)',
      capabilities: ['room-envelope', 'furniture-bounds'],
      origin: 'demo-simulated',
      demo: true,
    },
    notes: [
      'Dieser Datensatz ist eine gekennzeichnete Demo-Simulation.',
      'Es findet kein Zugriff auf Kamera, LiDAR oder ein iPhone statt.',
      'Unsicherheiten sind plausible Planungsannahmen (2–3 cm), keine kalibrierte Sensorstreuung.',
    ],
    drafts: [
      { target: { type: 'room' }, dimension: 'width', measurement: scanMeasure(5.18, 0.03) },
      { target: { type: 'room' }, dimension: 'depth', measurement: scanMeasure(4.06, 0.03) },
      { target: { type: 'room' }, dimension: 'height', measurement: scanMeasure(2.62, 0.025) },
      {
        target: { type: 'furniture-kind', kind: 'sofa', index: 0 },
        dimension: 'width',
        measurement: scanMeasure(2.12, 0.02),
      },
      {
        target: { type: 'furniture-kind', kind: 'sofa', index: 0 },
        dimension: 'depth',
        measurement: scanMeasure(0.91, 0.02),
      },
      {
        target: { type: 'furniture-kind', kind: 'sofa', index: 0 },
        dimension: 'height',
        measurement: scanMeasure(0.84, 0.02),
      },
      {
        target: { type: 'furniture-kind', kind: 'table', index: 0 },
        dimension: 'width',
        measurement: scanMeasure(1.18, 0.02),
      },
      {
        target: { type: 'furniture-kind', kind: 'table', index: 0 },
        dimension: 'depth',
        measurement: scanMeasure(0.68, 0.02),
      },
      {
        target: { type: 'furniture-kind', kind: 'table', index: 0 },
        dimension: 'height',
        measurement: scanMeasure(0.46, 0.015),
      },
    ],
  }
}
