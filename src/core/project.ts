import {
  PROJECT_SCHEMA,
  PROJECT_SCHEMA_VERSION,
  type DigitalTwinProject,
  type DimensionKey,
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
    table: [1.2, 0.45, 0.7, '#d5a879'],
    chair: [0.52, 0.86, 0.55, '#758ba5'],
    cabinet: [1.4, 1.9, 0.45, '#52657e'],
    bed: [1.8, 0.55, 2, '#8ba6c7'],
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
