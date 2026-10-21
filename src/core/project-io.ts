import {
  PROJECT_SCHEMA,
  PROJECT_SCHEMA_VERSION,
  type DigitalTwinProject,
  type Dimensions,
  type FurnitureKind,
  type FurnitureObject,
  type Measurement,
  type MeasurementSource,
  type Position3D,
  type Room,
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
  return validateProject(value)
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
    furniture,
  } satisfies DigitalTwinProject

  if (issues.length > 0) throw new ProjectFormatError(issues)
  return project
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
    rotationYDeg: finiteNumber(item.rotationYDeg, `${path}.rotationYDeg`, issues),
    color: text(item.color, `${path}.color`, issues),
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

function isoDate(value: unknown, path: string, issues: string[]): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value
  issues.push(`${path} muss ein ISO-Datum sein.`)
  return ''
}
