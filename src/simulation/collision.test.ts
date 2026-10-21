import { describe, expect, it } from 'vitest'
import { createSeedProject } from '../core/project'
import {
  checkTransportPath,
  furnitureToObb,
  intersectsObb,
  isObbInsideRoom,
  placementStatus,
} from './collision'

describe('FIT-Kollisionskern', () => {
  it('erkennt getrennte Starter-Möbel als nicht überlappend', () => {
    const project = createSeedProject()
    expect(
      intersectsObb(furnitureToObb(project.furniture[0]), furnitureToObb(project.furniture[1])),
    ).toBe(false)
    expect(placementStatus(project, project.furniture[0].id).status).toBe('clear')
  })

  it('meldet Kollision, wenn ein Objekt in ein anderes geschoben wird', () => {
    const seed = createSeedProject()
    const project = {
      ...seed,
      furniture: seed.furniture.map((item) => ({ ...item, minimumClearanceM: 0 })),
    }
    const sofa = project.furniture[0]
    const table = project.furniture[1]
    const result = checkTransportPath(project, sofa.id, {
      position: { ...table.position },
      orientation: { ...sofa.orientation },
    })
    expect(result.status).toBe('collision')
    expect(result.colliderId).toBe(table.id)
    expect(result.checkedSamples).toBeGreaterThan(1)
  })

  it('unterscheidet Mindestabstand von harter OBB-Berührung', () => {
    const project = createSeedProject()
    const sofa = project.furniture[0]
    const table = project.furniture[1]
    const nearButSeparate = {
      ...table.position,
      xM: sofa.position.xM + sofa.dimensions.width.valueM / 2 + table.dimensions.width.valueM / 2 + 0.03,
      zM: sofa.position.zM,
    }
    const moved = {
      ...project,
      furniture: project.furniture.map((item) =>
        item.id === table.id ? { ...item, position: nearButSeparate } : item,
      ),
    }
    expect(placementStatus(moved, table.id).status).toBe('clearance')
  })

  it('erkennt Türfreizone und Raumaustritt ohne Wegsuche', () => {
    const seed = createSeedProject()
    const sofa = { ...seed.furniture[0], minimumClearanceM: 0 }
    const project = { ...seed, furniture: [sofa] }
    const doorResult = checkTransportPath(project, sofa.id, {
      position: { xM: -1.35, yM: 0, zM: 1.7 },
      orientation: { ...sofa.orientation },
    })
    expect(doorResult.status).toBe('door-blocked')

    const outside = checkTransportPath(project, sofa.id, {
      position: { xM: 0, yM: 0, zM: -8 },
      orientation: { ...sofa.orientation },
    })
    expect(outside.status).toBe('outside-room')
    expect(isObbInsideRoom(furnitureToObb(sofa), project)).toBe(true)
  })

  it('weist ungültige Schrittweiten zurück', () => {
    const project = createSeedProject()
    expect(() =>
      checkTransportPath(
        project,
        project.furniture[0].id,
        {
          position: project.furniture[0].position,
          orientation: project.furniture[0].orientation,
        },
        0,
      ),
    ).toThrow(RangeError)
  })
})
