import type { FurnitureKind } from '../core/model'
import {
  SCAN_SCHEMA,
  SCAN_SCHEMA_VERSION,
  ScanFormatError,
  type ScanDocument,
  type ScanMeasurementDraft,
} from './contracts'

/** Documented assumption: RoomPlan JSON has no per-edge uncertainty. */
export const ROOMPLAN_DEFAULT_UNCERTAINTY_M = 0.05

const CATEGORY_TO_KIND: Record<string, FurnitureKind> = {
  sofa: 'sofa',
  couch: 'sofa',
  table: 'table',
  diningtable: 'table',
  coffeetable: 'table',
  chair: 'chair',
  stool: 'chair',
  storage: 'cabinet',
  cabinet: 'cabinet',
  refrigerator: 'cabinet',
  dishwasher: 'cabinet',
  oven: 'cabinet',
  bed: 'bed',
}

export function isRoomPlanLike(value: unknown): boolean {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const root = value as Record<string, unknown>
  if (root.schema === SCAN_SCHEMA) return false
  return (
    Array.isArray(root.objects) ||
    Array.isArray(root.walls) ||
    Array.isArray(root.floors) ||
    Array.isArray(root.doors)
  )
}

export function convertRoomPlanLike(
  value: unknown,
  importedAt = new Date().toISOString(),
): ScanDocument {
  if (!isRoomPlanLike(value)) {
    throw new ScanFormatError([
      'Die Datei ist weder reality-engine/scan@1 noch RoomPlan-ähnliches JSON (objects/walls/floors).',
    ])
  }
  const root = value as Record<string, unknown>
  const issues: string[] = []
  const floors = asObjects(root.floors)
  const walls = asObjects(root.walls)
  const objects = asObjects(root.objects)
  const envelope = deriveEnvelope(floors, walls, issues)
  const drafts: ScanMeasurementDraft[] = []
  if (envelope) {
    drafts.push(
      draft('width', envelope.width, importedAt),
      draft('depth', envelope.depth, importedAt),
      draft('height', envelope.height, importedAt),
    )
  }
  const kindIndex: Partial<Record<FurnitureKind, number>> = {}
  const skipped: string[] = []
  objects.forEach((item, index) => {
    const category = readCategory(item.category)
    const kind = category ? CATEGORY_TO_KIND[category] : undefined
    const dimensions = readDimensions(item.dimensions)
    if (!kind || !dimensions) {
      skipped.push(`objects[${index}] (${category ?? 'ohne Kategorie'})`)
      return
    }
    const nextIndex = kindIndex[kind] ?? 0
    kindIndex[kind] = nextIndex + 1
    const target = { type: 'furniture-kind' as const, kind, index: nextIndex }
    drafts.push(
      {
        target,
        dimension: 'width',
        measurement: measure(dimensions.width, importedAt),
      },
      {
        target,
        dimension: 'height',
        measurement: measure(dimensions.height, importedAt),
      },
      {
        target,
        dimension: 'depth',
        measurement: measure(dimensions.depth, importedAt),
      },
    )
  })
  if (!envelope) {
    issues.push('Raumhülle fehlt: weder floors[].dimensions noch ableitbare Wände.')
  }
  if (issues.length > 0) throw new ScanFormatError(issues)

  const notes = [
    'Dateiimport eines RoomPlan-ähnlichen JSON. Kein Live-Scan, kein LiDAR-Zugriff in dieser App.',
    `Messunsicherheit ${ROOMPLAN_DEFAULT_UNCERTAINTY_M} m ist eine dokumentierte Annahme, weil die Datei keine Unsicherheit enthält.`,
    'RoomPlan-Transform/Pose wird nicht übernommen: ohne kalibrierte Ursprungszuordnung wäre das fingierte Genauigkeit.',
    'Die native RoomPlan-/SwiftUI-Erfassung ist in native/RoomPlanBridge nur als unimplementiertes Skelett hinterlegt und nicht getestet.',
  ]
  if (skipped.length > 0) {
    notes.push(`Nicht zugeordnete Objekte: ${skipped.join(', ')}.`)
  }

  return {
    schema: SCAN_SCHEMA,
    schemaVersion: SCAN_SCHEMA_VERSION,
    id:
      typeof root.identifier === 'string' && root.identifier.trim()
        ? root.identifier
        : `roomplan-file-${importedAt}`,
    origin: 'file-import',
    demo: false,
    capturedAt: isoOrFallback(root.capturedAt ?? root.exportDate, importedAt),
    adapter: {
      id: 'roomplan-json-file',
      name: 'RoomPlan-JSON-Dateiimport',
      capabilities: ['room-envelope', 'furniture-bounds'],
      origin: 'file-import',
      demo: false,
    },
    notes,
    drafts,
  }
}

function draft(
  dimension: 'width' | 'depth' | 'height',
  valueM: number,
  at: string,
): ScanMeasurementDraft {
  return {
    target: { type: 'room' },
    dimension,
    measurement: measure(valueM, at),
  }
}

function measure(valueM: number, at: string) {
  return {
    valueM,
    uncertaintyM: ROOMPLAN_DEFAULT_UNCERTAINTY_M,
    source: 'scan' as const,
    updatedAt: at,
  }
}

function deriveEnvelope(
  floors: Record<string, unknown>[],
  walls: Record<string, unknown>[],
  issues: string[],
): { width: number; depth: number; height: number } | null {
  const floorDims = floors.map((item) => readDimensions(item.dimensions)).find(Boolean)
  let width = 0
  let depth = 0
  let height = 0
  if (floorDims) {
    width = floorDims.width
    depth = floorDims.depth > 0 ? floorDims.depth : floorDims.height
    height = walls
      .map((wall) => readDimensions(wall.dimensions)?.height ?? 0)
      .reduce((max, value) => Math.max(max, value), 0)
  } else if (walls.length > 0) {
    const box = wallAabb(walls)
    if (box) {
      width = box.width
      depth = box.depth
      height = box.height
    }
  }
  if (width <= 0 || depth <= 0 || height <= 0) {
    issues.push('Raumbreite, -tiefe oder -höhe konnte aus der Datei nicht bestimmt werden.')
    return null
  }
  return { width, depth, height }
}

function wallAabb(
  walls: Record<string, unknown>[],
): { width: number; depth: number; height: number } | null {
  let minX = Infinity
  let maxX = -Infinity
  let minZ = Infinity
  let maxZ = -Infinity
  let height = 0
  for (const wall of walls) {
    const dimensions = readDimensions(wall.dimensions)
    const origin = readTranslation(wall.transform)
    if (!dimensions || !origin) continue
    const half = Math.max(dimensions.width, dimensions.depth) / 2
    minX = Math.min(minX, origin.x - half)
    maxX = Math.max(maxX, origin.x + half)
    minZ = Math.min(minZ, origin.z - half)
    maxZ = Math.max(maxZ, origin.z + half)
    height = Math.max(height, dimensions.height)
  }
  if (!Number.isFinite(minX) || height <= 0) return null
  return { width: maxX - minX, depth: maxZ - minZ, height }
}

function readDimensions(
  value: unknown,
): { width: number; height: number; depth: number } | null {
  if (Array.isArray(value) && value.length >= 2) {
    const width = numberAt(value[0])
    const height = numberAt(value[1])
    const depth = value.length > 2 ? numberAt(value[2]) : 0
    if (width === null || height === null || depth === null) return null
    return { width: Math.abs(width), height: Math.abs(height), depth: Math.abs(depth) }
  }
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const item = value as Record<string, unknown>
    const width = numberAt(item.width ?? item.x)
    const height = numberAt(item.height ?? item.y)
    const depth = numberAt(item.depth ?? item.z)
    if (width === null || height === null || depth === null) return null
    return { width: Math.abs(width), height: Math.abs(height), depth: Math.abs(depth) }
  }
  return null
}

function readTranslation(value: unknown): { x: number; y: number; z: number } | null {
  if (Array.isArray(value) && value.length === 16 && value.every((item) => typeof item === 'number')) {
    return { x: value[12], y: value[13], z: value[14] }
  }
  if (Array.isArray(value) && value.length === 4 && Array.isArray(value[3])) {
    const column = value[3] as unknown[]
    const x = numberAt(column[0])
    const y = numberAt(column[1])
    const z = numberAt(column[2])
    if (x === null || y === null || z === null) return null
    return { x, y, z }
  }
  return null
}

function readCategory(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim().toLowerCase()
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    const keys = Object.keys(value)
    return keys[0] ? keys[0].toLowerCase() : null
  }
  return null
}

function asObjects(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) return []
  return value.filter(
    (item): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null && !Array.isArray(item),
  )
}

function numberAt(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function isoOrFallback(value: unknown, fallback: string): string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value)) ? value : fallback
}
