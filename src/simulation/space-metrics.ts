import type { DigitalTwinProject } from '../core/model'
import {
  doorClearanceObb,
  furnitureToObb,
  intersectsObb,
  pointInPolygon,
  projectedFootprint,
} from './collision'

export interface SpaceMetrics {
  floorAreaM2: number
  furnitureFootprintM2: number
  freeAreaM2: number
  occupancyPercent: number
  collisionPairs: [string, string][]
  blockedDoorIds: string[]
  gridCellM: number
}

/**
 * Deterministic grid integration of the union of projected OBB footprints.
 * The returned cell size makes the numerical resolution explicit.
 */
export function calculateSpaceMetrics(
  project: DigitalTwinProject,
  gridCellM = 0.05,
): SpaceMetrics {
  if (!Number.isFinite(gridCellM) || gridCellM <= 0) {
    throw new RangeError('Die Rasterweite muss größer als 0 m sein.')
  }
  const floorAreaM2 =
    project.room.dimensions.width.valueM * project.room.dimensions.depth.valueM
  const roomWidth = project.room.dimensions.width.valueM
  const roomDepth = project.room.dimensions.depth.valueM
  const columns = Math.ceil(roomWidth / gridCellM)
  const rows = Math.ceil(roomDepth / gridCellM)
  const cellWidth = roomWidth / columns
  const cellDepth = roomDepth / rows
  const footprints = project.furniture.map(projectedFootprint)
  let occupiedCells = 0
  for (let column = 0; column < columns; column += 1) {
    const x = -roomWidth / 2 + (column + 0.5) * cellWidth
    for (let row = 0; row < rows; row += 1) {
      const z = -roomDepth / 2 + (row + 0.5) * cellDepth
      if (footprints.some((polygon) => pointInPolygon({ x, z }, polygon))) {
        occupiedCells += 1
      }
    }
  }
  const furnitureFootprintM2 = occupiedCells * cellWidth * cellDepth
  const freeAreaM2 = Math.max(0, floorAreaM2 - furnitureFootprintM2)
  const occupancyPercent =
    floorAreaM2 === 0 ? 0 : Math.min(100, (furnitureFootprintM2 / floorAreaM2) * 100)
  const collisionPairs: [string, string][] = []
  for (let first = 0; first < project.furniture.length; first += 1) {
    for (let second = first + 1; second < project.furniture.length; second += 1) {
      if (
        intersectsObb(
          furnitureToObb(project.furniture[first]),
          furnitureToObb(project.furniture[second]),
        )
      ) {
        collisionPairs.push([
          project.furniture[first].id,
          project.furniture[second].id,
        ])
      }
    }
  }
  const blockedDoorIds = project.doors
    .filter((door) => {
      const zone = doorClearanceObb(project, door)
      return project.furniture.some((item) => intersectsObb(furnitureToObb(item), zone))
    })
    .map((door) => door.id)
  return {
    floorAreaM2,
    furnitureFootprintM2,
    freeAreaM2,
    occupancyPercent,
    collisionPairs,
    blockedDoorIds,
    gridCellM,
  }
}
