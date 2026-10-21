import type { DigitalTwinProject } from '../core/model'

export interface SpaceMetrics {
  floorAreaM2: number
  furnitureFootprintM2: number
  freeAreaM2: number
  occupancyPercent: number
}

/**
 * Deterministic geometric baseline. Overlaps between furniture are deliberately
 * not resolved in Phase 1, so the footprint is an upper-bound estimate.
 */
export function calculateSpaceMetrics(project: DigitalTwinProject): SpaceMetrics {
  const floorAreaM2 =
    project.room.dimensions.width.valueM * project.room.dimensions.depth.valueM
  const furnitureFootprintM2 = project.furniture.reduce(
    (sum, item) => sum + item.dimensions.width.valueM * item.dimensions.depth.valueM,
    0,
  )
  const freeAreaM2 = Math.max(0, floorAreaM2 - furnitureFootprintM2)
  const occupancyPercent =
    floorAreaM2 === 0 ? 0 : Math.min(100, (furnitureFootprintM2 / floorAreaM2) * 100)
  return { floorAreaM2, furnitureFootprintM2, freeAreaM2, occupancyPercent }
}
