import {
  PROJECT_SCHEMA,
  type DigitalTwinProject,
  type DimensionKey,
  type FurnitureKind,
  type LastScanRecord,
  type Measurement,
  type MeasurementSource,
  type ScanOrigin,
} from '../core/model'
import { createMeasurement, updateFurnitureMeasurement, updateRoomMeasurement } from '../core/project'
import {
  SCAN_SCHEMA,
  SCAN_SCHEMA_VERSION,
  ScanFormatError,
  type ScanApplyResult,
  type ScanCapability,
  type ScanDocument,
  type ScanMeasurementDraft,
  type ScanTarget,
} from './contracts'
import { convertRoomPlanLike, isRoomPlanLike } from './roomplan'
import { validateScanGeometry } from './geometry'

export { ScanFormatError }

export function parseIncomingScan(source: string): ScanDocument {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new ScanFormatError(['Die Datei enthält kein gültiges JSON.'])
  }
  if (isRoomPlanLike(value)) return convertRoomPlanLike(value)
  return validateScanDocument(value)
}

export function parseScanDocument(source: string): ScanDocument {
  let value: unknown
  try {
    value = JSON.parse(source)
  } catch {
    throw new ScanFormatError(['Die Datei enthält kein gültiges JSON.'])
  }
  return validateScanDocument(value)
}

export function validateScanDocument(value: unknown): ScanDocument {
  const issues: string[] = []
  const root = record(value, '$', issues)
  if (root.schema !== SCAN_SCHEMA) issues.push(`$.schema muss "${SCAN_SCHEMA}" sein.`)
  if (root.schemaVersion !== SCAN_SCHEMA_VERSION) {
    issues.push(`$.schemaVersion ${String(root.schemaVersion)} wird nicht unterstützt.`)
  }
  const origin = parseOrigin(root.origin, '$.origin', issues)
  const demo = root.demo === true
  if (origin === 'demo-simulated' && !demo) {
    issues.push('$.demo muss true sein, wenn origin demo-simulated ist.')
  }
  if (origin === 'file-import' && demo) {
    issues.push('Datei-Importe dürfen nicht als Demo-Simulation gekennzeichnet sein.')
  }
  const adapterRoot = record(root.adapter, '$.adapter', issues)
  const capabilities = Array.isArray(adapterRoot.capabilities)
    ? adapterRoot.capabilities.filter((item): item is ScanCapability =>
        item === 'room-envelope' || item === 'furniture-bounds',
      )
    : (issues.push('$.adapter.capabilities muss eine Liste bekannter Fähigkeiten sein.'), [])
  const drafts = Array.isArray(root.drafts)
    ? root.drafts.map((item, index) => parseDraft(item, `$.drafts[${index}]`, issues))
    : (issues.push('$.drafts muss eine Liste sein.'), [])
  const notes = Array.isArray(root.notes)
    ? root.notes.filter((item): item is string => typeof item === 'string')
    : []
  const document: ScanDocument = {
    schema: SCAN_SCHEMA,
    schemaVersion: SCAN_SCHEMA_VERSION,
    id: text(root.id, '$.id', issues),
    origin,
    demo,
    demoLabel: typeof root.demoLabel === 'string' ? root.demoLabel : undefined,
    capturedAt: isoDate(root.capturedAt, '$.capturedAt', issues),
    adapter: {
      id: text(adapterRoot.id, '$.adapter.id', issues),
      name: text(adapterRoot.name, '$.adapter.name', issues),
      capabilities,
      origin: parseOrigin(adapterRoot.origin ?? origin, '$.adapter.origin', issues),
      demo: adapterRoot.demo === true || demo,
    },
    notes,
    drafts,
  }
  if (issues.length > 0) throw new ScanFormatError(issues)
  return document
}

export function applyScanDocument(
  project: DigitalTwinProject,
  document: ScanDocument,
  now = new Date().toISOString(),
): ScanApplyResult {
  const issues = validateScanGeometry(project, document)
  const blocking = issues.filter((issue) => issue.severity === 'error')
  if (blocking.length > 0) {
    return { project, applied: 0, unmatched: document.drafts, issues }
  }
  let next = project
  const unmatched: ScanMeasurementDraft[] = []
  let applied = 0
  for (const draft of document.drafts) {
    const resolved = resolveTarget(next, draft.target)
    if (!resolved) {
      unmatched.push(draft)
      issues.push({
        path: describeTarget(draft.target),
        message: 'Zielobjekt wurde im Projekt nicht gefunden. Der Entwurf bleibt unangewendet.',
        severity: 'warning',
      })
      continue
    }
    const measurement = createMeasurement(
      draft.measurement.valueM,
      'scan',
      draft.measurement.uncertaintyM,
      now,
    )
    next =
      resolved.type === 'room'
        ? updateRoomMeasurement(
            next,
            draft.dimension,
            measurement.valueM,
            measurement.uncertaintyM,
            'scan',
            now,
          )
        : updateFurnitureMeasurement(
            next,
            resolved.id,
            draft.dimension,
            measurement.valueM,
            measurement.uncertaintyM,
            'scan',
            now,
          )
    applied += 1
  }
  const lastScan: LastScanRecord = {
    origin: document.origin,
    demo: document.demo,
    adapterId: document.adapter.id,
    importedAt: now,
    draftCount: document.drafts.length,
    issueCount: issues.length,
  }
  return {
    project: { ...next, updatedAt: now, lastScan },
    applied,
    unmatched,
    issues,
  }
}

export function correctMeasurement(
  project: DigitalTwinProject,
  target: ScanTarget,
  dimension: DimensionKey,
  valueM: number,
  uncertaintyM: number,
  source: MeasurementSource = 'manual',
  now = new Date().toISOString(),
): DigitalTwinProject {
  const resolved = resolveTarget(project, target)
  if (!resolved) throw new Error('Korrekturziel wurde nicht gefunden.')
  if (resolved.type === 'room') {
    return updateRoomMeasurement(project, dimension, valueM, uncertaintyM, source, now)
  }
  return updateFurnitureMeasurement(project, resolved.id, dimension, valueM, uncertaintyM, source, now)
}

export function exportScanDocument(document: ScanDocument): string {
  return JSON.stringify(validateScanDocument(document), null, 2)
}

export function emptyLastScan(): LastScanRecord | null {
  return null
}

export function isScanDocumentPayload(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { schema?: unknown }).schema === SCAN_SCHEMA
  )
}

export function isProjectPayload(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (value as { schema?: unknown }).schema === PROJECT_SCHEMA
  )
}

function resolveTarget(
  project: DigitalTwinProject,
  target: ScanTarget,
): { type: 'room' } | { type: 'furniture'; id: string } | null {
  if (target.type === 'room') return { type: 'room' }
  if (target.type === 'furniture') {
    return project.furniture.some((item) => item.id === target.id)
      ? { type: 'furniture', id: target.id }
      : null
  }
  const matches = project.furniture.filter((item) => item.kind === target.kind)
  const hit = matches[target.index]
  return hit ? { type: 'furniture', id: hit.id } : null
}

function describeTarget(target: ScanTarget): string {
  if (target.type === 'room') return 'room'
  if (target.type === 'furniture') return `furniture:${target.id}`
  return `furniture-kind:${target.kind}[${target.index}]`
}

function parseDraft(value: unknown, path: string, issues: string[]): ScanMeasurementDraft {
  const item = record(value, path, issues)
  return {
    target: parseTarget(item.target, `${path}.target`, issues),
    dimension: parseDimension(item.dimension, `${path}.dimension`, issues),
    measurement: parseMeasurement(item.measurement, `${path}.measurement`, issues),
  }
}

function parseTarget(value: unknown, path: string, issues: string[]): ScanTarget {
  const item = record(value, path, issues)
  if (item.type === 'room') return { type: 'room' }
  if (item.type === 'furniture') {
    return { type: 'furniture', id: text(item.id, `${path}.id`, issues) }
  }
  const kinds: FurnitureKind[] = ['sofa', 'table', 'chair', 'cabinet', 'bed']
  const kind = kinds.includes(item.kind as FurnitureKind)
    ? (item.kind as FurnitureKind)
    : (issues.push(`${path}.kind ist unbekannt.`), 'table')
  const index = typeof item.index === 'number' && Number.isInteger(item.index) && item.index >= 0
    ? item.index
    : (issues.push(`${path}.index muss eine nichtnegative Ganzzahl sein.`), 0)
  if (item.type !== 'furniture-kind') issues.push(`${path}.type ist unbekannt.`)
  return { type: 'furniture-kind', kind, index }
}

function parseDimension(value: unknown, path: string, issues: string[]): DimensionKey {
  if (value === 'width' || value === 'height' || value === 'depth') return value
  issues.push(`${path} muss width, height oder depth sein.`)
  return 'width'
}

function parseMeasurement(value: unknown, path: string, issues: string[]): Measurement {
  const item = record(value, path, issues)
  const sources: MeasurementSource[] = ['manual', 'import', 'scan']
  const source = sources.includes(item.source as MeasurementSource)
    ? (item.source as MeasurementSource)
    : (issues.push(`${path}.source ist unbekannt.`), 'scan')
  if (source !== 'scan') {
    issues.push(`${path}.source muss in einem Scan-Dokument "scan" sein.`)
  }
  const valueM = finite(item.valueM, `${path}.valueM`, issues)
  const uncertaintyM = finite(item.uncertaintyM, `${path}.uncertaintyM`, issues)
  if (valueM <= 0) issues.push(`${path}.valueM muss größer als 0 sein.`)
  if (uncertaintyM < 0) issues.push(`${path}.uncertaintyM darf nicht negativ sein.`)
  return {
    valueM,
    uncertaintyM,
    source: 'scan',
    updatedAt: isoDate(item.updatedAt, `${path}.updatedAt`, issues),
  }
}

function parseOrigin(value: unknown, path: string, issues: string[]): ScanOrigin {
  if (value === 'demo-simulated' || value === 'file-import') return value
  issues.push(`${path} muss demo-simulated oder file-import sein.`)
  return 'file-import'
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

function finite(value: unknown, path: string, issues: string[]): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  issues.push(`${path} muss eine endliche Zahl sein.`)
  return 0
}

function isoDate(value: unknown, path: string, issues: string[]): string {
  if (typeof value === 'string' && !Number.isNaN(Date.parse(value))) return value
  issues.push(`${path} muss ein ISO-Datum sein.`)
  return ''
}
