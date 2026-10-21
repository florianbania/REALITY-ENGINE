import type {
  DigitalTwinProject,
  Door,
  FurnitureObject,
  Orientation3D,
  Position3D,
} from '../core/model'

export interface Vec3 {
  x: number
  y: number
  z: number
}

export interface Point2 {
  x: number
  z: number
}

export interface Obb {
  center: Vec3
  halfSize: Vec3
  axes: [Vec3, Vec3, Vec3]
}

export interface TransformDraft {
  position: Position3D
  orientation: Orientation3D
}

export type FitStatus =
  | 'clear'
  | 'collision'
  | 'clearance'
  | 'outside-room'
  | 'door-blocked'

export interface PathCheckResult {
  status: FitStatus
  checkedSamples: number
  sampleStepM: number
  firstIssueAtM?: number
  colliderId?: string
}

const EPSILON = 1e-8

export function furnitureToObb(
  item: FurnitureObject,
  transform: TransformDraft = item,
): Obb {
  const axes = orientationAxes(transform.orientation)
  const halfSize = {
    x: item.dimensions.width.valueM / 2,
    y: item.dimensions.height.valueM / 2,
    z: item.dimensions.depth.valueM / 2,
  }
  const localCenter = scale(axes[1], halfSize.y)
  return {
    center: add(
      { x: transform.position.xM, y: transform.position.yM, z: transform.position.zM },
      localCenter,
    ),
    halfSize,
    axes,
  }
}

/** Full 15-axis separating-axis test for two oriented 3D boxes. */
export function intersectsObb(a: Obb, b: Obb, clearanceM = 0): boolean {
  const aHalf = [a.halfSize.x, a.halfSize.y, a.halfSize.z].map(
    (value) => value + clearanceM / 2,
  )
  const bHalf = [b.halfSize.x, b.halfSize.y, b.halfSize.z].map(
    (value) => value + clearanceM / 2,
  )
  const rotation = a.axes.map((axisA) => b.axes.map((axisB) => dot(axisA, axisB)))
  const absolute = rotation.map((row) => row.map((value) => Math.abs(value) + EPSILON))
  const centerDelta = subtract(b.center, a.center)
  const translated = a.axes.map((axis) => dot(centerDelta, axis))

  for (let index = 0; index < 3; index += 1) {
    const radiusA = aHalf[index]
    const radiusB =
      bHalf[0] * absolute[index][0] +
      bHalf[1] * absolute[index][1] +
      bHalf[2] * absolute[index][2]
    if (Math.abs(translated[index]) > radiusA + radiusB) return false
  }

  for (let index = 0; index < 3; index += 1) {
    const radiusA =
      aHalf[0] * absolute[0][index] +
      aHalf[1] * absolute[1][index] +
      aHalf[2] * absolute[2][index]
    const radiusB = bHalf[index]
    const projected = Math.abs(
      translated[0] * rotation[0][index] +
        translated[1] * rotation[1][index] +
        translated[2] * rotation[2][index],
    )
    if (projected > radiusA + radiusB) return false
  }

  for (let aIndex = 0; aIndex < 3; aIndex += 1) {
    for (let bIndex = 0; bIndex < 3; bIndex += 1) {
      const radiusA =
        aHalf[(aIndex + 1) % 3] * absolute[(aIndex + 2) % 3][bIndex] +
        aHalf[(aIndex + 2) % 3] * absolute[(aIndex + 1) % 3][bIndex]
      const radiusB =
        bHalf[(bIndex + 1) % 3] * absolute[aIndex][(bIndex + 2) % 3] +
        bHalf[(bIndex + 2) % 3] * absolute[aIndex][(bIndex + 1) % 3]
      const projected = Math.abs(
        translated[(aIndex + 2) % 3] * rotation[(aIndex + 1) % 3][bIndex] -
          translated[(aIndex + 1) % 3] * rotation[(aIndex + 2) % 3][bIndex],
      )
      if (projected > radiusA + radiusB) return false
    }
  }
  return true
}

export function isObbInsideRoom(obb: Obb, project: DigitalTwinProject): boolean {
  const halfWidth = project.room.dimensions.width.valueM / 2
  const halfDepth = project.room.dimensions.depth.valueM / 2
  const height = project.room.dimensions.height.valueM
  return obbCorners(obb).every(
    (corner) =>
      corner.x >= -halfWidth - EPSILON &&
      corner.x <= halfWidth + EPSILON &&
      corner.z >= -halfDepth - EPSILON &&
      corner.z <= halfDepth + EPSILON &&
      corner.y >= -EPSILON &&
      corner.y <= height + EPSILON,
  )
}

export function checkTransportPath(
  project: DigitalTwinProject,
  furnitureId: string,
  target: TransformDraft,
  sampleStepM = 0.05,
): PathCheckResult {
  if (!Number.isFinite(sampleStepM) || sampleStepM <= 0) {
    throw new RangeError('Die Prüfschrittweite muss größer als 0 m sein.')
  }
  const moving = project.furniture.find((item) => item.id === furnitureId)
  if (!moving) throw new Error(`Möbelobjekt "${furnitureId}" wurde nicht gefunden.`)
  const start = { position: moving.position, orientation: moving.orientation }
  const distance = distance3(start.position, target.position)
  const angleSpan = Math.max(
    Math.abs(target.orientation.rotationYDeg - start.orientation.rotationYDeg),
    Math.abs(target.orientation.tiltXDeg - start.orientation.tiltXDeg),
    Math.abs(target.orientation.tiltZDeg - start.orientation.tiltZDeg),
  )
  const segments = Math.max(1, Math.ceil(distance / sampleStepM), Math.ceil(angleSpan / 3))
  const others = project.furniture.filter((item) => item.id !== furnitureId)

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    const transform = interpolateTransform(start, target, progress)
    const movingObb = furnitureToObb(moving, transform)
    const common = {
      checkedSamples: index + 1,
      sampleStepM,
      firstIssueAtM: distance * progress,
    }
    if (!isObbInsideRoom(movingObb, project)) {
      return { status: 'outside-room', ...common }
    }
    for (const door of project.doors) {
      if (intersectsObb(movingObb, doorClearanceObb(project, door))) {
        return { status: 'door-blocked', colliderId: door.id, ...common }
      }
    }
    for (const other of others) {
      const otherObb = furnitureToObb(other)
      if (intersectsObb(movingObb, otherObb)) {
        return { status: 'collision', colliderId: other.id, ...common }
      }
      const requiredClearance = Math.max(
        moving.minimumClearanceM,
        other.minimumClearanceM,
      )
      if (requiredClearance > 0 && intersectsObb(movingObb, otherObb, requiredClearance)) {
        return { status: 'clearance', colliderId: other.id, ...common }
      }
    }
  }
  return { status: 'clear', checkedSamples: segments + 1, sampleStepM }
}

/** Conservative rectangular door swing/clearance zone inside the room. */
export function doorClearanceObb(project: DigitalTwinProject, door: Door): Obb {
  const roomWidth = project.room.dimensions.width.valueM
  const roomDepth = project.room.dimensions.depth.valueM
  const width = door.width.valueM
  const depth = door.swingDepthM
  const height = door.height.valueM
  const horizontal = door.wall === 'north' || door.wall === 'south'
  const center: Vec3 = { x: 0, y: height / 2, z: 0 }
  if (door.wall === 'south') {
    center.x = door.offsetM
    center.z = roomDepth / 2 - depth / 2
  } else if (door.wall === 'north') {
    center.x = door.offsetM
    center.z = -roomDepth / 2 + depth / 2
  } else if (door.wall === 'east') {
    center.x = roomWidth / 2 - depth / 2
    center.z = door.offsetM
  } else {
    center.x = -roomWidth / 2 + depth / 2
    center.z = door.offsetM
  }
  return {
    center,
    halfSize: {
      x: (horizontal ? width : depth) / 2,
      y: height / 2,
      z: (horizontal ? depth : width) / 2,
    },
    axes: [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
  }
}

export function placementStatus(
  project: DigitalTwinProject,
  furnitureId: string,
): PathCheckResult {
  const item = project.furniture.find((candidate) => candidate.id === furnitureId)
  if (!item) throw new Error(`Möbelobjekt "${furnitureId}" wurde nicht gefunden.`)
  return checkTransportPath(
    project,
    furnitureId,
    { position: item.position, orientation: item.orientation },
    0.05,
  )
}

export function obbCorners(obb: Obb): Vec3[] {
  const corners: Vec3[] = []
  for (const x of [-1, 1]) {
    for (const y of [-1, 1]) {
      for (const z of [-1, 1]) {
        corners.push(
          add(
            obb.center,
            add(
              scale(obb.axes[0], obb.halfSize.x * x),
              add(
                scale(obb.axes[1], obb.halfSize.y * y),
                scale(obb.axes[2], obb.halfSize.z * z),
              ),
            ),
          ),
        )
      }
    }
  }
  return corners
}

export function projectedFootprint(item: FurnitureObject): Point2[] {
  const points = obbCorners(furnitureToObb(item)).map(({ x, z }) => ({ x, z }))
  return convexHull(points)
}

export function pointInPolygon(point: Point2, polygon: Point2[]): boolean {
  let inside = false
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index++) {
    const a = polygon[index]
    const b = polygon[previous]
    const crosses =
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x
    if (crosses) inside = !inside
  }
  return inside
}

function orientationAxes(orientation: Orientation3D): [Vec3, Vec3, Vec3] {
  const x = degreesToRadians(orientation.tiltXDeg)
  const y = degreesToRadians(orientation.rotationYDeg)
  const z = degreesToRadians(orientation.tiltZDeg)
  const a = Math.cos(x)
  const b = Math.sin(x)
  const c = Math.cos(y)
  const d = Math.sin(y)
  const e = Math.cos(z)
  const f = Math.sin(z)
  return [
    { x: c * e, y: a * f + b * e * d, z: b * f - a * e * d },
    { x: -c * f, y: a * e - b * f * d, z: b * e + a * f * d },
    { x: d, y: -b * c, z: a * c },
  ]
}

function interpolateTransform(
  start: TransformDraft,
  target: TransformDraft,
  progress: number,
): TransformDraft {
  const mix = (a: number, b: number) => a + (b - a) * progress
  return {
    position: {
      xM: mix(start.position.xM, target.position.xM),
      yM: mix(start.position.yM, target.position.yM),
      zM: mix(start.position.zM, target.position.zM),
    },
    orientation: {
      rotationYDeg: mix(
        start.orientation.rotationYDeg,
        target.orientation.rotationYDeg,
      ),
      tiltXDeg: mix(start.orientation.tiltXDeg, target.orientation.tiltXDeg),
      tiltZDeg: mix(start.orientation.tiltZDeg, target.orientation.tiltZDeg),
    },
  }
}

function distance3(a: Position3D, b: Position3D): number {
  return Math.hypot(a.xM - b.xM, a.yM - b.yM, a.zM - b.zM)
}

function degreesToRadians(value: number): number {
  return (value * Math.PI) / 180
}

function add(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x + b.x, y: a.y + b.y, z: a.z + b.z }
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return { x: a.x - b.x, y: a.y - b.y, z: a.z - b.z }
}

function scale(value: Vec3, factor: number): Vec3 {
  return { x: value.x * factor, y: value.y * factor, z: value.z * factor }
}

function dot(a: Vec3, b: Vec3): number {
  return a.x * b.x + a.y * b.y + a.z * b.z
}

function convexHull(points: Point2[]): Point2[] {
  const unique = [...new Map(points.map((point) => [`${point.x}:${point.z}`, point])).values()]
  unique.sort((a, b) => a.x - b.x || a.z - b.z)
  if (unique.length <= 2) return unique
  const cross = (origin: Point2, a: Point2, b: Point2) =>
    (a.x - origin.x) * (b.z - origin.z) - (a.z - origin.z) * (b.x - origin.x)
  const lower: Point2[] = []
  for (const point of unique) {
    while (lower.length >= 2 && cross(lower.at(-2)!, lower.at(-1)!, point) <= 0) {
      lower.pop()
    }
    lower.push(point)
  }
  const upper: Point2[] = []
  for (const point of [...unique].reverse()) {
    while (upper.length >= 2 && cross(upper.at(-2)!, upper.at(-1)!, point) <= 0) {
      upper.pop()
    }
    upper.push(point)
  }
  lower.pop()
  upper.pop()
  return [...lower, ...upper]
}
