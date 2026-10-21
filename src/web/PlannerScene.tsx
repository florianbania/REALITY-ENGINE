import { Canvas, type ThreeEvent } from '@react-three/fiber'
import {
  ContactShadows,
  Grid,
  Html,
  Line,
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  TransformControls,
} from '@react-three/drei'
import { Suspense } from 'react'
import { Euler, Matrix4, MathUtils, Vector3, type Object3D } from 'three'
import type {
  DigitalTwinProject,
  FurnitureObject,
  Orientation3D,
  Position3D,
} from '../core/model'
import type { Point2 } from '../simulation/collision'
import {
  doorClearanceObb,
  doorLeafObb,
  doorOpeningCenter,
  openingApertureObb,
  wallInward,
} from '../simulation/collision'
import type { SunResult } from '../simulation/sun'
import type { WorkspaceMode } from './store'

export type ViewMode = '3d' | 'plan'
export type TransformMode = 'none' | 'translate' | 'rotate'

interface PlannerSceneProps {
  project: DigitalTwinProject
  selectedId: string | null
  mode: WorkspaceMode
  viewMode: ViewMode
  transformMode: TransformMode
  collisionIds: string[]
  sun: SunResult | null
  measurementActive: boolean
  measurementPoints: Point2[]
  onMeasurePoint: (point: Point2) => void
  onSelect: (id: string | null) => void
  onTransform: (id: string, position: Position3D, orientation: Orientation3D) => void
}

function eulerFromAxes(axes: [{ x: number; y: number; z: number }, { x: number; y: number; z: number }, { x: number; y: number; z: number }]): [number, number, number] {
  const matrix = new Matrix4().makeBasis(
    new Vector3(axes[0].x, axes[0].y, axes[0].z),
    new Vector3(axes[1].x, axes[1].y, axes[1].z),
    new Vector3(axes[2].x, axes[2].y, axes[2].z),
  )
  const euler = new Euler().setFromRotationMatrix(matrix)
  return [euler.x, euler.y, euler.z]
}

function FurnitureMaterial({
  color,
  selected,
  issue,
}: {
  color: string
  selected: boolean
  issue: boolean
}) {
  const renderedColor = issue ? '#ee6a6a' : selected ? '#41e4f2' : color
  return (
    <meshStandardMaterial
      color={renderedColor}
      roughness={0.62}
      metalness={0.08}
      emissive={issue ? '#861f2d' : selected ? '#0b7885' : '#000000'}
      emissiveIntensity={issue || selected ? 0.34 : 0}
    />
  )
}

function Furniture({
  item,
  selected,
  issue,
  onClick,
}: {
  item: FurnitureObject
  selected: boolean
  issue: boolean
  onClick: (event: ThreeEvent<MouseEvent>) => void
}) {
  const w = item.dimensions.width.valueM
  const h = item.dimensions.height.valueM
  const d = item.dimensions.depth.valueM
  const material = (
    <FurnitureMaterial color={item.color} selected={selected} issue={issue} />
  )
  const meshProps = { castShadow: true, receiveShadow: true, onClick }

  return (
    <group
      name={item.id}
      position={[item.position.xM, item.position.yM, item.position.zM]}
      rotation={[
        MathUtils.degToRad(item.orientation.tiltXDeg),
        MathUtils.degToRad(item.orientation.rotationYDeg),
        MathUtils.degToRad(item.orientation.tiltZDeg),
      ]}
    >
      {item.kind === 'sofa' && (
        <>
          <mesh {...meshProps} position={[0, h * 0.3, 0]} scale={[w, h * 0.42, d]}>
            <boxGeometry />
            {material}
          </mesh>
          <mesh {...meshProps} position={[0, h * 0.68, d * 0.36]} scale={[w, h * 0.58, d * 0.2]}>
            <boxGeometry />
            {material}
          </mesh>
        </>
      )}
      {item.kind === 'table' && (
        <>
          <mesh {...meshProps} position={[0, h * 0.88, 0]} scale={[w, h * 0.18, d]}>
            <boxGeometry />
            {material}
          </mesh>
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <mesh
                {...meshProps}
                key={`${x}-${z}`}
                position={[x * w * 0.42, h * 0.42, z * d * 0.38]}
                scale={[0.055, h * 0.84, 0.055]}
              >
                <boxGeometry />
                {material}
              </mesh>
            )),
          )}
        </>
      )}
      {item.kind === 'chair' && (
        <>
          <mesh {...meshProps} position={[0, h * 0.47, 0]} scale={[w, h * 0.12, d]}>
            <boxGeometry />
            {material}
          </mesh>
          <mesh {...meshProps} position={[0, h * 0.74, d * 0.43]} scale={[w, h * 0.52, d * 0.1]}>
            <boxGeometry />
            {material}
          </mesh>
        </>
      )}
      {item.kind === 'cabinet' && (
        <mesh {...meshProps} position={[0, h / 2, 0]} scale={[w, h, d]}>
          <boxGeometry />
          {material}
        </mesh>
      )}
      {item.kind === 'armchair' && (
        <>
          <mesh {...meshProps} position={[0, h * 0.28, 0]} scale={[w, h * 0.38, d]}>
            <boxGeometry />
            {material}
          </mesh>
          <mesh {...meshProps} position={[0, h * 0.66, d * 0.34]} scale={[w, h * 0.52, d * 0.22]}>
            <boxGeometry />
            {material}
          </mesh>
        </>
      )}
      {item.kind === 'desk' && (
        <>
          <mesh {...meshProps} position={[0, h * 0.92, 0]} scale={[w, h * 0.08, d]}>
            <boxGeometry />
            {material}
          </mesh>
          {[-1, 1].map((x) => (
            <mesh
              {...meshProps}
              key={x}
              position={[x * w * 0.44, h * 0.46, 0]}
              scale={[0.05, h * 0.9, d * 0.92]}
            >
              <boxGeometry />
              {material}
            </mesh>
          ))}
        </>
      )}
      {item.kind === 'sideboard' && (
        <mesh {...meshProps} position={[0, h / 2, 0]} scale={[w, h, d]}>
          <boxGeometry />
          {material}
        </mesh>
      )}
      {item.kind === 'shelf' && (
        <>
          {[-1, 1].map((x) => (
            <mesh
              {...meshProps}
              key={x}
              position={[x * w * 0.46, h / 2, 0]}
              scale={[0.04, h, d]}
            >
              <boxGeometry />
              {material}
            </mesh>
          ))}
          {[0.12, 0.4, 0.68, 0.94].map((y) => (
            <mesh
              {...meshProps}
              key={y}
              position={[0, h * y, 0]}
              scale={[w, 0.03, d]}
            >
              <boxGeometry />
              {material}
            </mesh>
          ))}
        </>
      )}
      {item.kind === 'bed' && (
        <>
          <mesh {...meshProps} position={[0, h * 0.25, 0]} scale={[w, h * 0.5, d]}>
            <boxGeometry />
            {material}
          </mesh>
          <mesh {...meshProps} position={[0, h * 0.66, -d * 0.46]} scale={[w, h * 0.68, d * 0.08]}>
            <boxGeometry />
            {material}
          </mesh>
        </>
      )}
      {item.kind === 'nightstand' && (
        <mesh {...meshProps} position={[0, h / 2, 0]} scale={[w, h, d]}>
          <boxGeometry />
          {material}
        </mesh>
      )}
    </group>
  )
}

function MeasuredLine({ points }: { points: Point2[] }) {
  if (points.length !== 2) return null
  const distance = Math.hypot(points[1].x - points[0].x, points[1].z - points[0].z)
  const middle = {
    x: (points[0].x + points[1].x) / 2,
    z: (points[0].z + points[1].z) / 2,
  }
  return (
    <>
      <Line
        points={points.map((point) => [point.x, 0.045, point.z])}
        color="#f8d477"
        lineWidth={2}
      />
      <Html position={[middle.x, 0.1, middle.z]} center>
        <span className="measure-label">{distance.toFixed(2)} m</span>
      </Html>
    </>
  )
}

function Scene(props: PlannerSceneProps) {
  const {
    project,
    selectedId,
    mode,
    viewMode,
    transformMode,
    collisionIds,
    sun,
    measurementActive,
    measurementPoints,
    onMeasurePoint,
    onSelect,
    onTransform,
  } = props
  const width = project.room.dimensions.width.valueM
  const height = project.room.dimensions.height.valueM
  const depth = project.room.dimensions.depth.valueM
  const selected = project.furniture.find((item) => item.id === selectedId)
  const sunPosition: [number, number, number] = sun
    ? [
        sun.sceneDirection.x * 10,
        sun.sceneDirection.y * 10,
        sun.sceneDirection.z * 10,
      ]
    : [4, 7, 3]

  const selectedMesh = selected ? (
    <Furniture
      item={selected}
      selected
      issue={collisionIds.includes(selected.id)}
      onClick={(event) => {
        event.stopPropagation()
        onSelect(selected.id)
      }}
    />
  ) : null

  return (
    <>
      <color attach="background" args={[viewMode === 'plan' ? '#0d1722' : '#0b121d']} />
      {viewMode === '3d' ? (
        <PerspectiveCamera makeDefault position={[6.5, 5.2, 7]} fov={42} />
      ) : (
        <OrthographicCamera
          makeDefault
          position={[0, 10, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          zoom={Math.max(65, 420 / Math.max(width, depth))}
        />
      )}
      <ambientLight intensity={mode === 'sun' ? (sun?.isAboveHorizon ? 0.32 : 0.12) : 0.72} />
      <hemisphereLight args={['#bdefff', '#152233', mode === 'sun' ? 0.42 : 1]} />
      <directionalLight
        castShadow
        position={sunPosition}
        intensity={mode === 'sun' ? (sun?.isAboveHorizon ? 3.5 : 0) : 1.7}
        color={mode === 'sun' ? '#ffd39a' : '#d7f7ff'}
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
      />

      <group
        onClick={(event) => {
          if (event.delta > 3) return
          if (measurementActive) {
            onMeasurePoint({ x: event.point.x, z: event.point.z })
          } else {
            onSelect(null)
          }
        }}
      >
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#172332" roughness={0.86} />
        </mesh>
        {viewMode === '3d' && (
          <>
            <mesh receiveShadow position={[0, height / 2, -depth / 2]}>
              <boxGeometry args={[width, height, 0.06]} />
              <meshStandardMaterial color="#233144" roughness={0.92} side={2} />
            </mesh>
            <mesh receiveShadow position={[-width / 2, height / 2, 0]}>
              <boxGeometry args={[0.06, height, depth]} />
              <meshStandardMaterial color="#1d2a3b" roughness={0.92} side={2} />
            </mesh>
          </>
        )}
      </group>

      <Grid
        args={[width, depth]}
        position={[0, 0.003, 0]}
        cellSize={0.25}
        cellThickness={0.4}
        cellColor="#31445a"
        sectionSize={1}
        sectionThickness={0.8}
        sectionColor="#54728b"
        fadeDistance={viewMode === 'plan' ? 30 : 12}
        infiniteGrid={false}
      />

      {project.doors.map((door) => {
        const zone = doorClearanceObb(project, door)
        const leaf = doorLeafObb(project, door)
        const opening = doorOpeningCenter(project, door)
        const inward = wallInward(door.wall)
        const frame = door.frameThickness.valueM
        const tangent =
          door.wall === 'north' || door.wall === 'south'
            ? { x: 1, y: 0, z: 0 }
            : { x: 0, y: 0, z: 1 }
        return (
          <group key={door.id}>
            <mesh
              position={[zone.center.x, 0.018, zone.center.z]}
              rotation={[-Math.PI / 2, 0, 0]}
            >
              <planeGeometry args={[zone.halfSize.x * 2, zone.halfSize.z * 2]} />
              <meshBasicMaterial color="#efb45f" transparent opacity={0.16} depthWrite={false} />
            </mesh>
            {[-1, 1].map((side) => (
              <mesh
                key={side}
                position={[
                  opening.x + tangent.x * (door.width.valueM / 2 + frame / 2) * side + inward.x * 0.03,
                  door.height.valueM / 2,
                  opening.z + tangent.z * (door.width.valueM / 2 + frame / 2) * side + inward.z * 0.03,
                ]}
              >
                <boxGeometry args={[
                  door.wall === 'east' || door.wall === 'west' ? frame : frame,
                  door.height.valueM,
                  door.wall === 'north' || door.wall === 'south' ? frame : frame,
                ]} />
                <meshStandardMaterial color="#c4b7a2" roughness={0.85} />
              </mesh>
            ))}
            <mesh
              position={[leaf.center.x, leaf.center.y, leaf.center.z]}
              rotation={eulerFromAxes(leaf.axes)}
            >
              <boxGeometry
                args={[leaf.halfSize.x * 2, leaf.halfSize.y * 2, leaf.halfSize.z * 2]}
              />
              <meshStandardMaterial color="#d8c3a2" roughness={0.7} />
            </mesh>
          </group>
        )
      })}

      {project.openings.map((opening) => {
        const aperture = openingApertureObb(project, opening)
        const lit = sun?.illuminatedOpeningIds.includes(opening.id) ?? false
        return (
          <mesh
            key={opening.id}
            position={[aperture.center.x, aperture.center.y, aperture.center.z]}
          >
            <boxGeometry
              args={[aperture.halfSize.x * 2, aperture.halfSize.y * 2, aperture.halfSize.z * 2]}
            />
            <meshStandardMaterial
              color={lit ? '#f4d27a' : '#7ec8e8'}
              emissive={lit ? '#f0c14a' : '#1a3a4a'}
              emissiveIntensity={lit ? 0.85 : 0.12}
              transparent
              opacity={0.55}
              roughness={0.2}
            />
          </mesh>
        )
      })}

      {mode === 'sun' && sun && (
        <group>
          <Line
            points={[
              [0, 0.04, 0],
              [sun.roomNorthAxis.x * 1.4, 0.04, sun.roomNorthAxis.z * 1.4],
            ]}
            color="#6ee7ff"
            lineWidth={2}
          />
          <Html position={[sun.roomNorthAxis.x * 1.55, 0.12, sun.roomNorthAxis.z * 1.55]} center>
            <span className="measure-label">N</span>
          </Html>
        </group>
      )}

      {project.furniture
        .filter((item) => item.id !== selectedId)
        .map((item) => (
          <Furniture
            key={item.id}
            item={item}
            selected={false}
            issue={collisionIds.includes(item.id)}
            onClick={(event) => {
              event.stopPropagation()
              onSelect(item.id)
            }}
          />
        ))}

      {selectedMesh &&
        (transformMode === 'none' || measurementActive ? (
          selectedMesh
        ) : (
          <TransformControls
            mode={transformMode}
            size={0.78}
            onObjectChange={(event) => {
              if (!event) return
              const controls = event.target as unknown as { object?: Object3D }
              const object = controls.object
              if (!object || !selected) return
              onTransform(
                selected.id,
                { xM: object.position.x, yM: object.position.y, zM: object.position.z },
                {
                  tiltXDeg: MathUtils.radToDeg(object.rotation.x),
                  rotationYDeg: MathUtils.radToDeg(object.rotation.y),
                  tiltZDeg: MathUtils.radToDeg(object.rotation.z),
                },
              )
            }}
          >
            {selectedMesh}
          </TransformControls>
        ))}

      <MeasuredLine points={measurementPoints} />
      {viewMode === '3d' && (
        <ContactShadows
          position={[0, 0.012, 0]}
          opacity={0.4}
          scale={Math.max(width, depth) * 1.4}
          blur={2.4}
          far={4}
        />
      )}
      <OrbitControls
        makeDefault
        target={[0, viewMode === '3d' ? Math.min(height * 0.35, 1.1) : 0, 0]}
        enableRotate={viewMode === '3d'}
        enablePan
        minDistance={3}
        maxDistance={15}
        maxPolarAngle={Math.PI / 2.03}
      />
    </>
  )
}

export function PlannerScene(props: PlannerSceneProps) {
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  )
}
