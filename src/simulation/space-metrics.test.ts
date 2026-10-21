import { describe, expect, it } from 'vitest'
import { createSeedProject } from '../core/project'
import { calculateSpaceMetrics } from './space-metrics'

describe('SPACE-Geometriekern', () => {
  it('berechnet Grundfläche und Möbel-Footprint deterministisch in m²', () => {
    const metrics = calculateSpaceMetrics(createSeedProject())

    expect(metrics.floorAreaM2).toBeCloseTo(21.32)
    expect(metrics.furnitureFootprintM2).toBeCloseTo(2.73)
    expect(metrics.freeAreaM2).toBeCloseTo(18.59)
    expect(metrics.occupancyPercent).toBeCloseTo(12.8048, 3)
  })
})
