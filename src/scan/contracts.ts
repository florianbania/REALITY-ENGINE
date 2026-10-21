import type {
  DigitalTwinProject,
  DimensionKey,
  FurnitureKind,
  LastScanRecord,
  Measurement,
  ScanOrigin,
} from '../core/model'

export const SCAN_SCHEMA = 'reality-engine/scan'
export const SCAN_SCHEMA_VERSION = 1 as const

export class ScanFormatError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Scan-Datei ist ungültig: ${issues.join(' · ')}`)
    this.name = 'ScanFormatError'
  }
}

export type ScanCapability = 'room-envelope' | 'furniture-bounds'

export type { LastScanRecord, ScanOrigin }

export interface ScanAdapterInfo {
  id: string
  name: string
  capabilities: ScanCapability[]
  origin: ScanOrigin
  demo: boolean
}

export type ScanTarget =
  | { type: 'room' }
  | { type: 'furniture'; id: string }
  | { type: 'furniture-kind'; kind: FurnitureKind; index: number }

export interface ScanMeasurementDraft {
  target: ScanTarget
  dimension: DimensionKey
  measurement: Measurement
}

export interface ScanPoseDraft {
  target: ScanTarget
  position: { xM: number; yM: number; zM: number }
  orientation: { rotationYDeg: number; tiltXDeg: number; tiltZDeg: number }
  derivedFrom: 'file-transform'
}

export interface ScanOpeningDraft {
  name: string
  kind: 'window' | 'opening'
  wall: 'north' | 'east' | 'south' | 'west'
  offsetM: number
  widthM: number
  heightM: number
  sillHeightM: number
}

export interface ScanGeometryIssue {
  path: string
  message: string
  severity: 'error' | 'warning'
}

/**
 * Unified scan payload. This is a document format, not a camera stream.
 * Demo payloads must set demo=true and origin='demo-simulated'.
 */
export interface ScanDocument {
  schema: typeof SCAN_SCHEMA
  schemaVersion: typeof SCAN_SCHEMA_VERSION
  id: string
  origin: ScanOrigin
  demo: boolean
  demoLabel?: string
  capturedAt: string
  adapter: ScanAdapterInfo
  notes: string[]
  drafts: ScanMeasurementDraft[]
  poses: ScanPoseDraft[]
  openingDrafts: ScanOpeningDraft[]
}

export interface ScanApplyResult {
  project: DigitalTwinProject
  applied: number
  posesApplied: number
  unmatched: ScanMeasurementDraft[]
  issues: ScanGeometryIssue[]
}

/**
 * Integration seam. Implementations must not pretend to access a device camera.
 * A demo adapter returns fixture drafts and advertises demo=true.
 */
export interface ScanAdapter {
  readonly info: ScanAdapterInfo
  isAvailable(): Promise<boolean>
  collect(project: DigitalTwinProject, signal: AbortSignal): Promise<ScanDocument>
}
