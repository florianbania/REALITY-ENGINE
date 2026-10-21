import type {
  DigitalTwinProject,
  Door,
  FurnitureObject,
  Opening,
  Orientation3D,
  Position3D,
  WallSide,
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
  startStatus: FitStatus
  interpolation: 'linear-shortest-yaw'
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

export function evaluatePose(
  project: DigitalTwinProject,
  moving: FurnitureObject,
  transform: TransformDraft,
): { status: FitStatus; colliderId?: string } {
  const movingObb = furnitureToObb(moving, transform)
  if (!isObbInsideRoom(movingObb, project)) return { status: 'outside-room' }
  for (const door of project.doors) {
    if (furnitureIntersectsDoor(project, moving, transform, door)) {
      return { status: 'door-blocked', colliderId: door.id }
    }
  }
  for (const other of project.furniture) {
    if (other.id === moving.id) continue
    const otherObb = furnitureToObb(other)
    if (intersectsObb(movingObb, otherObb)) {
      return { status: 'collision', colliderId: other.id }
    }
    const requiredClearance = Math.max(moving.minimumClearanceM, other.minimumClearanceM)
    if (requiredClearance > 0 && intersectsObb(movingObb, otherObb, requiredClearance)) {
      return { status: 'clearance', colliderId: other.id }
    }
  }
  return { status: 'clear' }
}

export function checkTransportPath(
  project: DigitalTwinProject,
  furnitureId: string,
  target: TransformDraft,
  sampleStepM = 0.02,
): PathCheckResult {
  if (!Number.isFinite(sampleStepM) || sampleStepM <= 0) {
    throw new RangeError('Die Prüfschrittweite muss größer als 0 m sein.')
  }
  const moving = project.furniture.find((item) => item.id === furnitureId)
  if (!moving) throw new Error(`Möbelobjekt "${furnitureId}" wurde nicht gefunden.`)
  const start = { position: moving.position, orientation: moving.orientation }
  const startStatus = evaluatePose(project, moving, start).status
  const distance = distance3(start.position, target.position)
  const yawSpan = Math.abs(shortestDegDelta(start.orientation.rotationYDeg, target.orientation.rotationYDeg))
  const tiltSpan = Math.max(
    Math.abs(target.orientation.tiltXDeg - start.orientation.tiltXDeg),
    Math.abs(target.orientation.tiltZDeg - start.orientation.tiltZDeg),
  )
  const segments = Math.max(
    1,
    Math.ceil(distance / sampleStepM),
    Math.ceil(yawSpan / 2),
    Math.ceil(tiltSpan / 2),
  )

  for (let index = 0; index <= segments; index += 1) {
    const progress = index / segments
    const transform = interpolateTransform(start, target, progress)
    const sample = evaluatePose(project, moving, transform)
    if (sample.status !== 'clear') {
      return {
        status: sample.status,
        colliderId: sample.colliderId,
        checkedSamples: index + 1,
        sampleStepM,
        firstIssueAtM: distance * progress,
        startStatus,
        interpolation: 'linear-shortest-yaw',
      }
    }
  }
  return {
    status: 'clear',
    checkedSamples: segments + 1,
    sampleStepM,
    startStatus,
    interpolation: 'linear-shortest-yaw',
  }
}

export function wallInward(wall: WallSide): Vec3 {
  if (wall === 'south') return { x: 0, y: 0, z: -1 }
  if (wall === 'north') return { x: 0, y: 0, z: 1 }
  if (wall === 'east') return { x: -1, y: 0, z: 0 }
  return { x: 1, y: 0, z: 0 }
}

export function doorOpeningCenter(project: DigitalTwinProject, door: Door): Vec3 {
  const roomWidth = project.room.dimensions.width.valueM
  const roomDepth = project.room.dimensions.depth.valueM
  if (door.wall === 'south') return { x: door.offsetM, y: 0, z: roomDepth / 2 }
  if (door.wall === 'north') return { x: door.offsetM, y: 0, z: -roomDepth / 2 }
  if (door.wall === 'east') return { x: roomWidth / 2, y: 0, z: door.offsetM }
  return { x: -roomWidth / 2, y: 0, z: door.offsetM }
}

export function doorLeafObb(project: DigitalTwinProject, door: Door): Obb {
  const { hinge, closedDir, inward } = doorHingeFrame(project, door)
  const angle = clampDoorAngle(door.openingAngleDeg)
  const leafDir = rotateToward(closedDir, inward, (angle * Math.PI) / 180)
  const length = door.width.valueM
  const thickness = door.leafThickness.valueM
  const height = door.height.valueM
  const perp = unit({
    x: -leafDir.z,
    y: 0,
    z: leafDir.x,
  })
  const inwardPerp = dot(perp, inward) >= 0 ? perp : scale(perp, -1)
  const center = add(
    hinge,
    add(scale(leafDir, length / 2), add(scale(inwardPerp, thickness / 2), { x: 0, y: height / 2, z: 0 })),
  )
  return {
    center,
    halfSize: { x: length / 2, y: height / 2, z: thickness / 2 },
    axes: [leafDir, { x: 0, y: 1, z: 0 }, inwardPerp],
  }
}

export function doorObstacleObb(project: DigitalTwinProject, door: Door): Obb | null {
  const depth = door.visibleObstacle.valueM
  if (depth <= EPSILON) return null
  const inward = wallInward(door.wall)
  const opening = doorOpeningCenter(project, door)
  const width = door.width.valueM
  const height = Math.min(door.height.valueM, 0.4)
  const tangent =
    door.wall === 'north' || door.wall === 'south'
      ? { x: 1, y: 0, z: 0 }
      : { x: 0, y: 0, z: 1 }
  const center = add(opening, add(scale(inward, depth / 2), { x: 0, y: height / 2, z: 0 }))
  return {
    center,
    halfSize: { x: width / 2, y: height / 2, z: depth / 2 },
    axes: [tangent, { x: 0, y: 1, z: 0 }, inward],
  }
}

/**
 * Conservative axis-aligned box covering the opened leaf, the swing rectangle
 * at the stated angle, and a user-measured visible obstacle. Not a CAD sector.
 */
export function doorClearanceObb(project: DigitalTwinProject, door: Door): Obb {
  const parts = [doorLeafObb(project, door), doorSwingRectangle(project, door)]
  const obstacle = doorObstacleObb(project, door)
  if (obstacle) parts.push(obstacle)
  const corners = parts.flatMap((part) => obbCorners(part))
  const xs = corners.map((c) => c.x)
  const ys = corners.map((c) => c.y)
  const zs = corners.map((c) => c.z)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const minZ = Math.min(...zs)
  const maxZ = Math.max(...zs)
  return {
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2, z: (minZ + maxZ) / 2 },
    halfSize: { x: (maxX - minX) / 2, y: (maxY - minY) / 2, z: (maxZ - minZ) / 2 },
    axes: [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
  }
}

export function doorSwingRectangle(project: DigitalTwinProject, door: Door): Obb {
  const inward = wallInward(door.wall)
  const opening = doorOpeningCenter(project, door)
  const angle = clampDoorAngle(door.openingAngleDeg)
  const depth = Math.max(
    door.width.valueM * Math.sin((angle * Math.PI) / 180),
    door.swingDepthM,
  )
  const width = door.width.valueM
  const height = door.height.valueM
  const tangent =
    door.wall === 'north' || door.wall === 'south'
      ? { x: 1, y: 0, z: 0 }
      : { x: 0, y: 0, z: 1 }
  const center = add(opening, add(scale(inward, depth / 2), { x: 0, y: height / 2, z: 0 }))
  return {
    center,
    halfSize: { x: width / 2, y: height / 2, z: Math.max(depth, 0.02) / 2 },
    axes: [tangent, { x: 0, y: 1, z: 0 }, inward],
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
    0.02,
  )
}

export function furnitureIntersectsDoor(
  project: DigitalTwinProject,
  item: FurnitureObject,
  transform: TransformDraft,
  door: Door,
): boolean {
  const movingObb = furnitureToObb(item, transform)
  const parts = [doorLeafObb(project, door), doorSwingRectangle(project, door)]
  const obstacle = doorObstacleObb(project, door)
  if (obstacle) parts.push(obstacle)
  if (parts.some((part) => intersectsObb(movingObb, part))) return true
  return convexPolygonsOverlap(footprintFromObb(movingObb), doorFootprint(project, door))
}

export function openingApertureObb(project: DigitalTwinProject, opening: Opening): Obb {
  const roomWidth = project.room.dimensions.width.valueM
  const roomDepth = project.room.dimensions.depth.valueM
  const width = opening.width.valueM
  const height = opening.height.valueM
  const thickness = 0.05
  const horizontal = opening.wall === 'north' || opening.wall === 'south'
  const center: Vec3 = {
    x: 0,
    y: opening.sillHeightM + height / 2,
    z: 0,
  }
  if (opening.wall === 'south') {
    center.x = opening.offsetM
    center.z = roomDepth / 2 - thickness / 2
  } else if (opening.wall === 'north') {
    center.x = opening.offsetM
    center.z = -roomDepth / 2 + thickness / 2
  } else if (opening.wall === 'east') {
    center.x = roomWidth / 2 - thickness / 2
    center.z = opening.offsetM
  } else {
    center.x = -roomWidth / 2 + thickness / 2
    center.z = opening.offsetM
  }
  return {
    center,
    halfSize: {
      x: (horizontal ? width : thickness) / 2,
      y: height / 2,
      z: (horizontal ? thickness : width) / 2,
    },
    axes: [
      { x: 1, y: 0, z: 0 },
      { x: 0, y: 1, z: 0 },
      { x: 0, y: 0, z: 1 },
    ],
  }
}

export function doorFootprint(project: DigitalTwinProject, door: Door): Point2[] {
  const zone = doorClearanceObb(project, door)
  const hx = zone.halfSize.x
  const hz = zone.halfSize.z
  return [
    { x: zone.center.x - hx, z: zone.center.z - hz },
    { x: zone.center.x + hx, z: zone.center.z - hz },
    { x: zone.center.x + hx, z: zone.center.z + hz },
    { x: zone.center.x - hx, z: zone.center.z + hz },
  ]
}

export function footprintFromObb(obb: Obb): Point2[] {
  return convexHull(obbCorners(obb).map(({ x, z }) => ({ x, z })))
}

export function clipPolygonToRoom(polygon: Point2[], project: DigitalTwinProject): Point2[] {
  const halfW = project.room.dimensions.width.valueM / 2
  const halfD = project.room.dimensions.depth.valueM / 2
  return clipAabb(polygon, -halfW, halfW, -halfD, halfD)
}

export function convexPolygonsOverlap(a: Point2[], b: Point2[]): boolean {
  if (a.length < 3 || b.length < 3) return false
  return !separatedByEdges(a, b) && !separatedByEdges(b, a)
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

function doorHingeFrame(project: DigitalTwinProject, door: Door) {
  const inward = wallInward(door.wall)
  const look = { x: -inward.x, y: 0, z: -inward.z }
  const left = { x: look.z, y: 0, z: -look.x }
  const opening = doorOpeningCenter(project, door)
  const hingeSign = door.hinge === 'left' ? 1 : -1
  const hinge = add(opening, scale(left, hingeSign * (door.width.valueM / 2)))
  const closedDir = scale(left, -hingeSign)
  return { hinge, closedDir, inward, left, opening }
}

function clampDoorAngle(angle: number): number {
  return Math.min(180, Math.max(0, angle))
}

function rotateToward(from: Vec3, toward: Vec3, angle: number): Vec3 {
  const crossY = from.x * toward.z - from.z * toward.x
  const sign = crossY >= 0 ? 1 : -1
  const theta = sign * angle
  const cos = Math.cos(theta)
  const sin = Math.sin(theta)
  return unit({
    x: from.x * cos - from.z * sin,
    y: 0,
    z: from.x * sin + from.z * cos,
  })
}

function unit(value: Vec3): Vec3 {
  const length = Math.hypot(value.x, value.y, value.z) || 1
  return scale(value, 1 / length)
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
      rotationYDeg:
        start.orientation.rotationYDeg +
        shortestDegDelta(start.orientation.rotationYDeg, target.orientation.rotationYDeg) * progress,
      tiltXDeg: mix(start.orientation.tiltXDeg, target.orientation.tiltXDeg),
      tiltZDeg: mix(start.orientation.tiltZDeg, target.orientation.tiltZDeg),
    },
  }
}

function shortestDegDelta(from: number, to: number): number {
  const wrapped = ((((to - from) % 360) + 540) % 360) - 180
  return wrapped
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

function separatedByEdges(source: Point2[], other: Point2[]): boolean {
  for (let index = 0; index < source.length; index += 1) {
    const a = source[index]
    const b = source[(index + 1) % source.length]
    const nx = b.z - a.z
    const nz = -(b.x - a.x)
    const sourceProj = source.map((point) => point.x * nx + point.z * nz)
    const otherProj = other.map((point) => point.x * nx + point.z * nz)
    if (Math.max(...sourceProj) < Math.min(...otherProj) - EPSILON) return true
    if (Math.max(...otherProj) < Math.min(...sourceProj) - EPSILON) return true
  }
  return false
}

function clipAabb(
  polygon: Point2[],
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
): Point2[] {
  const clip = (
    input: Point2[],
    inside: (point: Point2) => boolean,
    intersect: (from: Point2, to: Point2) => Point2,
  ) => {
    const output: Point2[] = []
    for (let index = 0; index < input.length; index += 1) {
      const current = input[index]
      const previous = input[(index + input.length - 1) % input.length]
      const currentIn = inside(current)
      const previousIn = inside(previous)
      if (currentIn) {
        if (!previousIn) output.push(intersect(previous, current))
        output.push(current)
      } else if (previousIn) {
        output.push(intersect(previous, current))
      }
    }
    return output
  }
  let result = polygon
  result = clip(result, (point) => point.x >= minX, (from, to) => lerpX(from, to, minX))
  result = clip(result, (point) => point.x <= maxX, (from, to) => lerpX(from, to, maxX))
  result = clip(result, (point) => point.z >= minZ, (from, to) => lerpZ(from, to, minZ))
  result = clip(result, (point) => point.z <= maxZ, (from, to) => lerpZ(from, to, maxZ))
  return result
}

function lerpX(from: Point2, to: Point2, x: number): Point2 {
  const t = (x - from.x) / (to.x - from.x || 1)
  return { x, z: from.z + (to.z - from.z) * t }
}

function lerpZ(from: Point2, to: Point2, z: number): Point2 {
  const t = (z - from.z) / (to.z - from.z || 1)
  return { x: from.x + (to.x - from.x) * t, z }
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
