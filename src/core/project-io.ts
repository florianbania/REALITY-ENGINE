import {
  PROJECT_SCHEMA,
  PROJECT_SCHEMA_VERSION,
  type DigitalTwinProject,
  type Door,
  type Dimensions,
  type FurnitureKind,
  type FurnitureObject,
  type Measurement,
  type MeasurementSource,
  type Orientation3D,
  type Position3D,
  type Room,
  type LastScanRecord,
  type ScanOrigin,
  type SunSettings,
  type WallSide,
} from './model'

export class ProjectFormatError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Projektdatei ist ungültig: ${issues.join(' · ')}`)
    this.name = 'ProjectFormatError'
  }
}

export function exportProject(project: DigitalTwinProject): string {
  validateProject(project)
  return JSON.stringify(project, null, 2)
}

export function importProject(source: string): DigitalTwinProject {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new ProjectFormatError(['Die Datei enthält kein gültiges JSON.'])
  }
  return validateProject(migrateProjectValue(value))
}

export function validateProject(value: unknown): DigitalTwinProject {
  const issues: string[] = []
  const root = record(value, '$', issues)

  if (root.schema !== PROJECT_SCHEMA) {
    issues.push(`$.schema muss "${PROJECT_SCHEMA}" sein.`)
  }
  if (root.schemaVersion !== PROJECT_SCHEMA_VERSION) {
    issues.push(`$.schemaVersion ${String(root.schemaVersion)} wird nicht unterstützt.`)
  }

  const room = parseRoom(root.room, '$.room', issues)
  const doors = Array.isArray(root.doors)
    ? root.doors.map((item, index) => parseDoor(item, `$.doors[${index}]`, issues))
    : (issues.push('$.doors muss eine Liste sein.'), [])
  const furniture = Array.isArray(root.furniture)
    ? root.furniture.map((item, index) => parseFurniture(item, `$.furniture[${index}]`, issues))
    : (issues.push('$.furniture muss eine Liste sein.'), [])

  const project = {
    schema: PROJECT_SCHEMA,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: text(root.id, '$.id', issues),
    name: text(root.name, '$.name', issues),
    createdAt: isoDate(root.createdAt, '$.createdAt', issues),
    updatedAt: isoDate(root.updatedAt, '$.updatedAt', issues),
    room,
    doors,
    furniture,
    sun: parseSunSettings(root.sun, '$.sun', issues),
    lastScan: parseLastScan(root.lastScan, '$.lastScan', issues),
  } satisfies DigitalTwinProject

  if (issues.length > 0) throw new ProjectFormatError(issues)
  return project
}

/**
 * Pure migration used by file imports and Zustand persistence. V1 contained no
 * doors, site data, tilt or object clearances; no sensor values are invented.
 */
export function migrateProjectValue(value: unknown): unknown {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return value
  let root = value as Record<string, unknown>
  if (root.schema !== PROJECT_SCHEMA) return value
  if (root.schemaVersion === 1) {
    const furniture = Array.isArray(root.furniture)
      ? root.furniture.map((entry) => {
          if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return entry
          const item = entry as Record<string, unknown>
          return {
            ...item,
            orientation: {
              rotationYDeg:
                typeof item.rotationYDeg === 'number' && Number.isFinite(item.rotationYDeg)
                  ? item.rotationYDeg
                  : 0,
              tiltXDeg: 0,
              tiltZDeg: 0,
            },
            minimumClearanceM: 0.05,
            rotationYDeg: undefined,
          }
        })
      : root.furniture
    root = {
      ...root,
      schemaVersion: 2,
      doors: Array.isArray(root.doors) ? root.doors : [],
      furniture,
      sun:
        root.sun ??
        {
          latitude: 0,
          longitude: 0,
          timeZone: 'UTC',
          northOffsetDeg: 0,
          localDateTime: '2026-06-21T12:00',
        },
    }
  }
  if (root.schemaVersion === 2) {
    root = {
      ...root,
      schemaVersion: PROJECT_SCHEMA_VERSION,
      lastScan: root.lastScan ?? null,
    }
  }
  return root
}

function parseRoom(value: unknown, path: string, issues: string[]): Room {
  const item = record(value, path, issues)
  return {
    id: text(item.id, `${path}.id`, issues),
    name: text(item.name, `${path}.name`, issues),
    dimensions: parseDimensions(item.dimensions, `${path}.dimensions`, issues),
  }
}

function parseFurniture(value: unknown, path: string, issues: string[]): FurnitureObject {
  const item = record(value, path, issues)
  const kinds: FurnitureKind[] = ['sofa', 'table', 'chair', 'cabinet', 'bed']
  const kind = kinds.includes(item.kind as FurnitureKind)
    ? (item.kind as FurnitureKind)
    : (issues.push(`${path}.kind ist unbekannt.`), 'table')
  return {
    id: text(item.id, `${path}.id`, issues),
    name: text(item.name, `${path}.name`, issues),
    kind,
    dimensions: parseDimensions(item.dimensions, `${path}.dimensions`, issues),
    position: parsePosition(item.position, `${path}.position`, issues),
    orientation: parseOrientation(item.orientation, `${path}.orientation`, issues),
    minimumClearanceM: nonNegativeNumber(
      item.minimumClearanceM,
      `${path}.minimumClearanceM`,
      issues,
    ),
    color: text(item.color, `${path}.color`, issues),
  }
}

function parseDoor(value: unknown, path: string, issues: string[]): Door {
  const item = record(value, path, issues)
  const walls: WallSide[] = ['north', 'east', 'south', 'west']
  const wall = walls.includes(item.wall as WallSide)
    ? (item.wall as WallSide)
    : (issues.push(`${path}.wall ist unbekannt.`), 'south')
  return {
    id: text(item.id, `${path}.id`, issues),
    name: text(item.name, `${path}.name`, issues),
    wall,
    offsetM: finiteNumber(item.offsetM, `${path}.offsetM`, issues),
    width: parseMeasurement(item.width, `${path}.width`, issues),
    height: parseMeasurement(item.height, `${path}.height`, issues),
    swingDepthM: positiveNumber(item.swingDepthM, `${path}.swingDepthM`, issues),
  }
}

function parseSunSettings(value: unknown, path: string, issues: string[]): SunSettings {
  const item = record(value, path, issues)
  const latitude = finiteNumber(item.latitude, `${path}.latitude`, issues)
  const longitude = finiteNumber(item.longitude, `${path}.longitude`, issues)
  const northOffsetDeg = finiteNumber(
    item.northOffsetDeg,
    `${path}.northOffsetDeg`,
    issues,
  )
  if (latitude < -90 || latitude > 90) issues.push(`${path}.latitude liegt außerhalb ±90°.`)
  if (longitude < -180 || longitude > 180)
    issues.push(`${path}.longitude liegt außerhalb ±180°.`)
  const timeZone = text(item.timeZone, `${path}.timeZone`, issues)
  try {
    new Intl.DateTimeFormat('de-DE', { timeZone }).format()
  } catch {
    issues.push(`${path}.timeZone ist keine gültige IANA-Zeitzone.`)
  }
  const localDateTime = text(item.localDateTime, `${path}.localDateTime`, issues)
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) {
    issues.push(`${path}.localDateTime muss YYYY-MM-DDTHH:mm entsprechen.`)
  }
  return { latitude, longitude, timeZone, northOffsetDeg, localDateTime }
}

function parseLastScan(value: unknown, path: string, issues: string[]): LastScanRecord | null {
  if (value === null || value === undefined) return null
  const item = record(value, path, issues)
  const origins: ScanOrigin[] = ['demo-simulated', 'file-import']
  const origin = origins.includes(item.origin as ScanOrigin)
    ? (item.origin as ScanOrigin)
    : (issues.push(`${path}.origin ist unbekannt.`), 'file-import')
  const draftCount = finiteNumber(item.draftCount, `${path}.draftCount`, issues)
  const issueCount = finiteNumber(item.issueCount, `${path}.issueCount`, issues)
  if (draftCount < 0) issues.push(`${path}.draftCount darf nicht negativ sein.`)
  if (issueCount < 0) issues.push(`${path}.issueCount darf nicht negativ sein.`)
  return {
    origin,
    demo: item.demo === true,
    adapterId: text(item.adapterId, `${path}.adapterId`, issues),
    importedAt: isoDate(item.importedAt, `${path}.importedAt`, issues),
    draftCount,
    issueCount,
  }
}

function parseDimensions(value: unknown, path: string, issues: string[]): Dimensions {
  const item = record(value, path, issues)
  return {
    width: parseMeasurement(item.width, `${path}.width`, issues),
    height: parseMeasurement(item.height, `${path}.height`, issues),
    depth: parseMeasurement(item.depth, `${path}.depth`, issues),
  }
}

function parseMeasurement(value: unknown, path: string, issues: string[]): Measurement {
  const item = record(value, path, issues)
  const sources: MeasurementSource[] = ['manual', 'import', 'scan']
  const source = sources.includes(item.source as MeasurementSource)
    ? (item.source as MeasurementSource)
    : (issues.push(`${path}.source ist unbekannt.`), 'manual')
  const valueM = positiveNumber(item.valueM, `${path}.valueM`, issues)
  const uncertaintyM = finiteNumber(item.uncertaintyM, `${path}.uncertaintyM`, issues)
  if (uncertaintyM < 0) issues.push(`${path}.uncertaintyM darf nicht negativ sein.`)
  return {
    valueM,
    source,
    uncertaintyM,
    updatedAt: isoDate(item.updatedAt, `${path}.updatedAt`, issues),
  }
}

function parsePosition(value: unknown, path: string, issues: string[]): Position3D {
  const item = record(value, path, issues)
  return {
    xM: finiteNumber(item.xM, `${path}.xM`, issues),
    yM: finiteNumber(item.yM, `${path}.yM`, issues),
    zM: finiteNumber(item.zM, `${path}.zM`, issues),
  }
}

function parseOrientation(value: unknown, path: string, issues: string[]): Orientation3D {
  const item = record(value, path, issues)
  return {
    rotationYDeg: finiteNumber(item.rotationYDeg, `${path}.rotationYDeg`, issues),
    tiltXDeg: finiteNumber(item.tiltXDeg, `${path}.tiltXDeg`, issues),
    tiltZDeg: finiteNumber(item.tiltZDeg, `${path}.tiltZDeg`, issues),
  }
}

function record(value: unknown, path: string, issues: string[]): Record<string, unknown> {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  issues.push(`${path} muss ein Objekt sein.`)
  return {}
}

function text(value: unknown, path: string, issues: string[]): string {
  if (typeof value === 'string' && value.trim().length > 0) return value
  issues.push(`${path} muss Text enthalten.`)
  return ''
}

function finiteNumber(value: unknown, path: string, issues: string[]): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  issues.push(`${path} muss eine endliche Zahl sein.`)
  return 0
}

function positiveNumber(value: unknown, path: string, issues: string[]): number {
  const result = finiteNumber(value, path, issues)
  if (result <= 0) issues.push(`${path} muss größer als 0 sein.`)
  return result
}

function nonNegativeNumber(value: unknown, path: string, issues: string[]): number {
  const result = finiteNumber(value, path, issues)
  if (result < 0) issues.push(`${path} darf nicht negativ sein.`)
  return result
}

function isoDate(value: unknown, path: string, issues: string[]): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value
  issues.push(`${path} muss ein ISO-Datum sein.`)
  return ''
}
