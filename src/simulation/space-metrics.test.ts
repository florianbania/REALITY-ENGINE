import { describe, expect, it } from 'vitest'
import { createSeedProject } from '../core/project'
import { calculateSpaceMetrics } from './space-metrics'

describe('SPACE-Geometriekern', () => {
  it('integriert die Union projizierter OBB-Flächen auf einem expliziten Raster', () => {
    const metrics = calculateSpaceMetrics(createSeedProject())

    expect(metrics.gridCellM).toBe(0.05)
    expect(metrics.floorAreaM2).toBeCloseTo(21.32)
    expect(metrics.furnitureFootprintM2).toBeGreaterThan(2)
    expect(metrics.furnitureFootprintM2).toBeLessThan(3.2)
    expect(metrics.freeAreaM2).toBeCloseTo(
      metrics.floorAreaM2 - metrics.furnitureFootprintM2,
    )
    expect(metrics.collisionPairs).toEqual([])
    expect(metrics.blockedDoorIds).toEqual([])
  })

  it('meldet Möbelkollisionen und blockierte Türfreizonen', () => {
    const project = createSeedProject()
    const sofa = project.furniture[0]
    const table = project.furniture[1]
    const overlapping = {
      ...project,
      furniture: [
        sofa,
        { ...table, position: { ...sofa.position } },
      ],
    }
    const metrics = calculateSpaceMetrics(overlapping)
    expect(metrics.collisionPairs).toEqual([[sofa.id, table.id]])

    const blockingDoor = {
      ...project,
      furniture: [
        {
          ...sofa,
          position: { xM: -1.35, yM: 0, zM: 1.7 },
        },
        table,
      ],
    }
    expect(calculateSpaceMetrics(blockingDoor).blockedDoorIds).toEqual([project.doors[0].id])
  })
})
