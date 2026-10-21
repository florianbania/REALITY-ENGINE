import {
  FURNITURE_LABELS,
  PROJECT_SCHEMA,
  PROJECT_SCHEMA_VERSION,
  type DigitalTwinProject,
  type DimensionKey,
  type Door,
  type FurnitureKind,
  type FurnitureObject,
  type Measurement,
  type MeasurementSource,
} from './model'

const ISO_SEED = '2026-01-01T00:00:00.000Z'

export function createMeasurement(
  valueM: number,
  source: MeasurementSource = 'manual',
  uncertaintyM = 0.01,
  updatedAt = new Date().toISOString(),
): Measurement {
  assertMeasurementValues(valueM, uncertaintyM)
  return { valueM, source, uncertaintyM, updatedAt }
}

export function createNonNegativeMeasurement(
  valueM: number,
  source: MeasurementSource = 'manual',
  uncertaintyM = 0.01,
  updatedAt = new Date().toISOString(),
): Measurement {
  if (!Number.isFinite(valueM) || valueM < 0) {
    throw new RangeError('Das Maß darf nicht negativ sein.')
  }
  if (!Number.isFinite(uncertaintyM) || uncertaintyM < 0) {
    throw new RangeError('Die Messunsicherheit darf nicht negativ sein.')
  }
  return { valueM, source, uncertaintyM, updatedAt }
}

export function createStarterProject(now = new Date().toISOString()): DigitalTwinProject {
  const measured = (valueM: number) => createMeasurement(valueM, 'manual', 0.01, now)
  return {
    schema: PROJECT_SCHEMA,
    schemaVersion: PROJECT_SCHEMA_VERSION,
    id: crypto.randomUUID(),
    name: 'Mein Wohnraum',
    createdAt: now,
    updatedAt: now,
    room: {
      id: crypto.randomUUID(),
      name: 'Wohnzimmer',
      dimensions: {
        width: measured(5.2),
        height: measured(2.65),
        depth: measured(4.1),
      },
    },
    doors: [
      {
        id: crypto.randomUUID(),
        name: 'Zimmertür',
        wall: 'south',
        offsetM: -1.35,
        width: measured(0.9),
        height: measured(2.01),
        swingDepthM: 0.9,
        frameThickness: measured(0.06),
        leafThickness: measured(0.04),
        openingAngleDeg: 90,
        hinge: 'left',
        visibleObstacle: createNonNegativeMeasurement(0, 'manual', 0.005, now),
      },
    ],
    openings: [
      {
        id: crypto.randomUUID(),
        name: 'Westfenster',
        kind: 'window',
        wall: 'west',
        offsetM: 0,
        width: measured(1.4),
        height: measured(1.3),
        sillHeightM: 0.9,
      },
    ],
    furniture: [
      createFurniture('sofa', 'Sofa', { xM: 0.2, yM: 0, zM: -0.9 }, now),
      createFurniture('table', 'Couchtisch', { xM: 0.8, yM: 0, zM: 0.55 }, now),
    ],
    sun: {
      latitude: 52.52,
      longitude: 13.405,
      timeZone: 'Europe/Berlin',
      northOffsetDeg: 0,
      localDateTime: '2026-06-21T14:00',
    },
    lastScan: null,
  }
}

export function createFurniture(
  kind: FurnitureKind,
  name: string,
  position = { xM: 0, yM: 0, zM: 0 },
  now = new Date().toISOString(),
): FurnitureObject {
  const defaults: Record<FurnitureKind, [number, number, number, string]> = {
    sofa: [2.1, 0.82, 0.9, '#21c7d9'],
    armchair: [0.86, 0.84, 0.82, '#3aa8b8'],
    table: [1.2, 0.45, 0.7, '#d5a879'],
    desk: [1.4, 0.75, 0.7, '#c4a07a'],
    chair: [0.52, 0.86, 0.55, '#758ba5'],
    cabinet: [1.4, 1.9, 0.45, '#52657e'],
    sideboard: [1.6, 0.72, 0.42, '#6a7d94'],
    shelf: [0.8, 1.8, 0.32, '#8b9aab'],
    bed: [1.8, 0.55, 2, '#8ba6c7'],
    nightstand: [0.45, 0.52, 0.4, '#9a8b78'],
  }
  const [width, height, depth, color] = defaults[kind]
  const measured = (valueM: number) => createMeasurement(valueM, 'manual', 0.01, now)
  return {
    id: crypto.randomUUID(),
    name,
    kind,
    dimensions: {
      width: measured(width),
      height: measured(height),
      depth: measured(depth),
    },
    position,
    orientation: {
      rotationYDeg: 0,
      tiltXDeg: 0,
      tiltZDeg: 0,
    },
    minimumClearanceM: 0.05,
    color,
  }
}

export function updateRoomMeasurement(
  project: DigitalTwinProject,
  dimension: DimensionKey,
  valueM: number,
  uncertaintyM: number,
  source: MeasurementSource,
  now = new Date().toISOString(),
): DigitalTwinProject {
  const measurement = createMeasurement(valueM, source, uncertaintyM, now)
  return {
    ...project,
    updatedAt: now,
    room: {
      ...project.room,
      dimensions: { ...project.room.dimensions, [dimension]: measurement },
    },
  }
}

export function updateFurnitureMeasurement(
  project: DigitalTwinProject,
  furnitureId: string,
  dimension: DimensionKey,
  valueM: number,
  uncertaintyM: number,
  source: MeasurementSource,
  now = new Date().toISOString(),
): DigitalTwinProject {
  const measurement = createMeasurement(valueM, source, uncertaintyM, now)
  let found = false
  const furniture = project.furniture.map((item) => {
    if (item.id !== furnitureId) return item
    found = true
    return {
      ...item,
      dimensions: { ...item.dimensions, [dimension]: measurement },
    }
  })
  if (!found) throw new Error(`Möbelobjekt "${furnitureId}" wurde nicht gefunden.`)
  return { ...project, updatedAt: now, furniture }
}

export function updateFurniturePose(
  project: DigitalTwinProject,
  furnitureId: string,
  position: { xM: number; yM: number; zM: number },
  orientation: { rotationYDeg: number; tiltXDeg: number; tiltZDeg: number },
  now = new Date().toISOString(),
): DigitalTwinProject {
  let found = false
  const furniture = project.furniture.map((item) => {
    if (item.id !== furnitureId) return item
    found = true
    return { ...item, position, orientation }
  })
  if (!found) throw new Error(`Möbelobjekt "${furnitureId}" wurde nicht gefunden.`)
  return { ...project, updatedAt: now, furniture }
}

export function updateDoor(
  project: DigitalTwinProject,
  doorId: string,
  patch: Partial<
    Pick<
      Door,
      | 'offsetM'
      | 'swingDepthM'
      | 'openingAngleDeg'
      | 'hinge'
      | 'wall'
      | 'name'
    >
  > & {
    width?: { valueM: number; uncertaintyM: number; source: MeasurementSource }
    height?: { valueM: number; uncertaintyM: number; source: MeasurementSource }
    frameThickness?: { valueM: number; uncertaintyM: number; source: MeasurementSource }
    leafThickness?: { valueM: number; uncertaintyM: number; source: MeasurementSource }
    visibleObstacle?: { valueM: number; uncertaintyM: number; source: MeasurementSource }
  },
  now = new Date().toISOString(),
): DigitalTwinProject {
  let found = false
  const doors = project.doors.map((door) => {
    if (door.id !== doorId) return door
    found = true
    const measure = (
      current: Measurement,
      next?: { valueM: number; uncertaintyM: number; source: MeasurementSource },
    ) =>
      next
        ? next.valueM === 0
          ? createNonNegativeMeasurement(next.valueM, next.source, next.uncertaintyM, now)
          : createMeasurement(next.valueM, next.source, next.uncertaintyM, now)
        : current
    const width = measure(door.width, patch.width)
    const openingAngleDeg = patch.openingAngleDeg ?? door.openingAngleDeg
    const visibleObstacle = measure(door.visibleObstacle, patch.visibleObstacle)
    const swingDepthM =
      patch.swingDepthM ??
      width.valueM * Math.sin((Math.min(90, Math.max(0, openingAngleDeg)) * Math.PI) / 180) +
        visibleObstacle.valueM
    return {
      ...door,
      ...patch,
      width,
      height: measure(door.height, patch.height),
      frameThickness: measure(door.frameThickness, patch.frameThickness),
      leafThickness: measure(door.leafThickness, patch.leafThickness),
      visibleObstacle,
      openingAngleDeg,
      swingDepthM,
    }
  })
  if (!found) throw new Error(`Tür "${doorId}" wurde nicht gefunden.`)
  return { ...project, updatedAt: now, doors }
}

export { FURNITURE_LABELS }

function assertMeasurementValues(valueM: number, uncertaintyM: number): void {
  if (!Number.isFinite(valueM) || valueM <= 0) {
    throw new RangeError('Das Maß muss größer als 0 m und endlich sein.')
  }
  if (!Number.isFinite(uncertaintyM) || uncertaintyM < 0) {
    throw new RangeError('Die Messunsicherheit darf nicht negativ sein.')
  }
}

/** Deterministic sample for tests and documentation only. */
export function createSeedProject(): DigitalTwinProject {
  return createStarterProject(ISO_SEED)
}
