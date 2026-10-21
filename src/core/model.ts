export const PROJECT_SCHEMA = 'reality-engine/project'
export const PROJECT_SCHEMA_VERSION = 1 as const

export type MeasurementSource = 'manual' | 'import' | 'scan'
export type FurnitureKind = 'sofa' | 'table' | 'chair' | 'cabinet' | 'bed'

export interface Measurement {
  /** Canonical SI value. UI conversions must happen at the boundary. */
  valueM: number
  source: MeasurementSource
  uncertaintyM: number
  updatedAt: string
}

export interface Dimensions {
  width: Measurement
  height: Measurement
  depth: Measurement
}

export interface Position3D {
  xM: number
  yM: number
  zM: number
}

export interface FurnitureObject {
  id: string
  name: string
  kind: FurnitureKind
  dimensions: Dimensions
  position: Position3D
  rotationYDeg: number
  color: string
}

export interface Room {
  id: string
  name: string
  dimensions: Dimensions
}

export interface DigitalTwinProject {
  schema: typeof PROJECT_SCHEMA
  schemaVersion: typeof PROJECT_SCHEMA_VERSION
  id: string
  name: string
  createdAt: string
  updatedAt: string
  room: Room
  furniture: FurnitureObject[]
}

export type DimensionKey = keyof Dimensions

export const SOURCE_LABELS: Record<MeasurementSource, string> = {
  manual: 'Manuell',
  import: 'Importiert',
  scan: 'Scan',
}
