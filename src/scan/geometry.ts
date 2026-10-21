import type { DigitalTwinProject, FurnitureObject } from '../core/model'
import { furnitureToObb, isObbInsideRoom } from '../simulation/collision'
import type { ScanDocument, ScanGeometryIssue, ScanMeasurementDraft } from './contracts'

const MIN_ROOM_M = 1.5
const MAX_ROOM_M = 20
const MIN_FURNITURE_M = 0.15
const MAX_FURNITURE_M = 6

/**
 * Deterministic geometry checks for scan drafts against the current twin.
 * Failures are reported; no values are invented to make a scan "fit".
 */
export function validateScanGeometry(
  project: DigitalTwinProject,
  document: ScanDocument,
): ScanGeometryIssue[] {
  const issues: ScanGeometryIssue[] = []
  const proposed = proposedDimensions(project, document.drafts)

  for (const key of ['width', 'depth', 'height'] as const) {
    const value = proposed.room[key]
    if (value < MIN_ROOM_M || value > MAX_ROOM_M) {
      issues.push({
        path: `room.${key}`,
        message: `Raummaß ${value.toFixed(2)} m liegt außerhalb plausibler Innenraumgrenzen (${MIN_ROOM_M}–${MAX_ROOM_M} m).`,
        severity: 'error',
      })
    }
  }

  for (const [id, dims] of proposed.furniture) {
    const item = project.furniture.find((entry) => entry.id === id)
    const label = item?.name ?? id
    for (const key of ['width', 'depth', 'height'] as const) {
      if (dims[key] < MIN_FURNITURE_M || dims[key] > MAX_FURNITURE_M) {
        issues.push({
          path: `furniture.${id}.${key}`,
          message: `${label}: ${key} ${dims[key].toFixed(2)} m ist geometrisch unplausibel.`,
          severity: 'error',
        })
      }
    }
    if (dims.width >= proposed.room.width) {
      issues.push({
        path: `furniture.${id}.width`,
        message: `${label} ist in der Breite nicht kleiner als der Raum.`,
        severity: 'error',
      })
    }
    if (dims.depth >= proposed.room.depth) {
      issues.push({
        path: `furniture.${id}.depth`,
        message: `${label} ist in der Tiefe nicht kleiner als der Raum.`,
        severity: 'error',
      })
    }
    if (dims.height >= proposed.room.height) {
      issues.push({
        path: `furniture.${id}.height`,
        message: `${label} übersteigt die Raumhöhe.`,
        severity: 'error',
      })
    }
  }

  const preview = previewProject(project, proposed)
  for (const item of preview.furniture) {
    if (!isObbInsideRoom(furnitureToObb(item), preview)) {
      issues.push({
        path: `furniture.${item.id}.placement`,
        message: `${item.name} würde mit den Scanmaßen die Raumhülle verlassen.`,
        severity: 'warning',
      })
    }
  }

  return issues
}

function proposedDimensions(
  project: DigitalTwinProject,
  drafts: ScanMeasurementDraft[],
): {
  room: { width: number; depth: number; height: number }
  furniture: Map<string, { width: number; depth: number; height: number }>
} {
  const room = {
    width: project.room.dimensions.width.valueM,
    depth: project.room.dimensions.depth.valueM,
    height: project.room.dimensions.height.valueM,
  }
  const furniture = new Map(
    project.furniture.map((item) => [
      item.id,
      {
        width: item.dimensions.width.valueM,
        depth: item.dimensions.depth.valueM,
        height: item.dimensions.height.valueM,
      },
    ]),
  )
  for (const draft of drafts) {
    if (draft.target.type === 'room') {
      room[draft.dimension] = draft.measurement.valueM
      continue
    }
    const target = draft.target
    const id =
      target.type === 'furniture'
        ? target.id
        : project.furniture.filter((item) => item.kind === target.kind)[target.index]?.id
    if (!id) continue
    const current = furniture.get(id)
    if (!current) continue
    current[draft.dimension] = draft.measurement.valueM
  }
  return { room, furniture }
}

function previewProject(
  project: DigitalTwinProject,
  proposed: ReturnType<typeof proposedDimensions>,
): DigitalTwinProject {
  const patchDims = (
    item: FurnitureObject,
    dims: { width: number; depth: number; height: number },
  ): FurnitureObject => ({
    ...item,
    dimensions: {
      width: { ...item.dimensions.width, valueM: dims.width },
      depth: { ...item.dimensions.depth, valueM: dims.depth },
      height: { ...item.dimensions.height, valueM: dims.height },
    },
  })
  return {
    ...project,
    room: {
      ...project.room,
      dimensions: {
        width: { ...project.room.dimensions.width, valueM: proposed.room.width },
        depth: { ...project.room.dimensions.depth, valueM: proposed.room.depth },
        height: { ...project.room.dimensions.height, valueM: proposed.room.height },
      },
    },
    furniture: project.furniture.map((item) => {
      const dims = proposed.furniture.get(item.id)
      return dims ? patchDims(item, dims) : item
    }),
  }
}
