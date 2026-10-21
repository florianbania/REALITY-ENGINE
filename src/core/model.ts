export const PROJECT_SCHEMA = 'reality-engine/project'
export const PROJECT_SCHEMA_VERSION = 5 as const

export type MeasurementSource = 'manual' | 'import' | 'scan'

export const FURNITURE_KINDS = [
  'sofa',
  'armchair',
  'table',
  'desk',
  'chair',
  'cabinet',
  'sideboard',
  'shelf',
  'bed',
  'nightstand',
] as const

export type FurnitureKind = (typeof FURNITURE_KINDS)[number]

export const FURNITURE_LABELS: Record<FurnitureKind, string> = {
  sofa: 'Sofa',
  armchair: 'Sessel',
  table: 'Tisch',
  desk: 'Schreibtisch',
  chair: 'Stuhl',
  cabinet: 'Schrank',
  sideboard: 'Sideboard',
  shelf: 'Regal',
  bed: 'Bett',
  nightstand: 'Nachttisch',
}

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

export interface Orientation3D {
  rotationYDeg: number
  tiltXDeg: number
  tiltZDeg: number
}

export interface FurnitureObject {
  id: string
  name: string
  kind: FurnitureKind
  dimensions: Dimensions
  position: Position3D
  orientation: Orientation3D
  minimumClearanceM: number
  color: string
}

export interface Room {
  id: string
  name: string
  dimensions: Dimensions
}

export type WallSide = 'north' | 'east' | 'south' | 'west'
export type HingeSide = 'left' | 'right'

export interface Door {
  id: string
  name: string
  wall: WallSide
  offsetM: number
  width: Measurement
  height: Measurement
  /** Conserved from v4; equals the interior swing depth at the current opening angle. */
  swingDepthM: number
  frameThickness: Measurement
  leafThickness: Measurement
  openingAngleDeg: number
  hinge: HingeSide
  /** User-measured depth of a visible obstacle in the swing (radiator, shoe rack). 0 if none. */
  visibleObstacle: Measurement
}

export type OpeningKind = 'window' | 'opening'

export interface Opening {
  id: string
  name: string
  kind: OpeningKind
  wall: WallSide
  offsetM: number
  width: Measurement
  height: Measurement
  sillHeightM: number
}

export interface SunSettings {
  latitude: number
  longitude: number
  timeZone: string
  /** Clockwise offset between room north (-Z) and geographic north. */
  northOffsetDeg: number
  localDateTime: string
}

export type ScanOrigin = 'demo-simulated' | 'file-import'

export interface LastScanRecord {
  origin: ScanOrigin
  demo: boolean
  adapterId: string
  importedAt: string
  draftCount: number
  issueCount: number
}

export interface DigitalTwinProject {
  schema: typeof PROJECT_SCHEMA
  schemaVersion: typeof PROJECT_SCHEMA_VERSION
  id: string
  name: string
  createdAt: string
  updatedAt: string
  room: Room
  doors: Door[]
  openings: Opening[]
  furniture: FurnitureObject[]
  sun: SunSettings
  lastScan: LastScanRecord | null
}

export type DimensionKey = keyof Dimensions

export const SOURCE_LABELS: Record<MeasurementSource, string> = {
  manual: 'Manuell',
  import: 'Importiert',
  scan: 'Scan',
}
