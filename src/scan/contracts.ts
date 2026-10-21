import type { DigitalTwinProject, Measurement } from '../core/model'

export type ScanCapability = 'room-envelope' | 'furniture-bounds'

export interface ScanAdapterInfo {
  id: string
  name: string
  capabilities: ScanCapability[]
}

export interface ScanMeasurementDraft {
  targetId: string
  dimension: 'width' | 'height' | 'depth'
  measurement: Measurement
}

/**
 * Future integration seam only. Phase 1 ships no scan adapter and never
 * fabricates sensor input.
 */
export interface ScanAdapter {
  readonly info: ScanAdapterInfo
  isAvailable(): Promise<boolean>
  collect(project: DigitalTwinProject, signal: AbortSignal): Promise<ScanMeasurementDraft[]>
}
