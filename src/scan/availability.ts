export type AvailabilityStatus = 'available' | 'unavailable' | 'unimplemented'

export interface AvailabilityProbe {
  fileApi: boolean
  /** Always false in this repository: no shipped native target. */
  nativeRoomPlan: boolean
  nativeObjectCapture: boolean
  nativeArKitLidar: boolean
}

export interface AvailabilityItem {
  id: string
  label: string
  status: AvailabilityStatus
  detail: string
}

export interface ScanAvailabilityReport {
  environment: 'web-browser'
  items: AvailabilityItem[]
}

export const STATUS_LABELS: Record<AvailabilityStatus, string> = {
  available: 'Verfügbar',
  unavailable: 'Nicht verfügbar',
  unimplemented: 'Nicht implementiert, ungetestet',
}

export function defaultAvailabilityProbe(): AvailabilityProbe {
  return {
    fileApi: typeof FileReader !== 'undefined',
    nativeRoomPlan: false,
    nativeObjectCapture: false,
    nativeArKitLidar: false,
  }
}

/**
 * Honest capability report. Native Apple APIs are never advertised as ready.
 */
export function reportScanAvailability(
  probe: AvailabilityProbe = defaultAvailabilityProbe(),
): ScanAvailabilityReport {
  return {
    environment: 'web-browser',
    items: [
      {
        id: 'file-import',
        label: 'JSON-Dateiimport (scan@1 / RoomPlan-ähnlich)',
        status: probe.fileApi ? 'available' : 'unavailable',
        detail: 'Einzige implementierte Aufnahmequelle in der Web-App.',
      },
      {
        id: 'demo-fixture',
        label: 'Gekennzeichnete Demo-Simulation',
        status: 'available',
        detail: 'Fixture-Daten, kein Sensor.',
      },
      {
        id: 'manual-correction',
        label: 'Manuelle Messwertkorrektur',
        status: 'available',
        detail: 'Setzt die Quelle auf Manuell. Keine automatische Bounding-Box aus einem Mesh.',
      },
      {
        id: 'roomplan-native',
        label: 'RoomPlan / ARKit-LiDAR (nativ)',
        status: 'unimplemented',
        detail:
          'Öffentlich dokumentiert: iOS 16+, Gerät mit LiDAR. In diesem Projekt nicht angebunden und nicht getestet.',
      },
      {
        id: 'object-capture',
        label: 'RealityKit Object Capture',
        status: 'unimplemented',
        detail:
          'Photogrammetrie laut Apple u. a. auf unterstütztem Mac bzw. iOS 17+. Hier nicht implementiert; reflektierende oder verdeckte Flächen bleiben unsicher.',
      },
      {
        id: 'bbox-from-mesh',
        label: 'Automatische Bounding-Box-Korrektur',
        status: 'unimplemented',
        detail:
          'Würde ein vollständiges Mesh voraussetzen. Verdeckte und spiegelnde Seiten unterschätzen typischerweise die Box. Keine Präzision angegeben.',
      },
    ],
  }
}
