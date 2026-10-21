import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { ContactShadows, Grid, OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'
import type { DigitalTwinProject, FurnitureObject } from '../core/model'
import type { WorkspaceMode } from './store'

interface RoomSceneProps {
  project: DigitalTwinProject
  selectedId: string | null
  mode: WorkspaceMode
  sunHour: number
  onSelect: (id: string | null) => void
}

function Material({ color, selected }: { color: string; selected: boolean }) {
  return (
    <meshStandardMaterial
      color={selected ? '#41e4f2' : color}
      roughness={0.62}
      metalness={0.08}
      emissive={selected ? '#0b7885' : '#000000'}
      emissiveIntensity={selected ? 0.32 : 0}
    />
  )
}

function FurnitureMesh({
  item,
  selected,
  onSelect,
}: {
  item: FurnitureObject
  selected: boolean
  onSelect: (event: ThreeEvent<MouseEvent>) => void
}) {
  const w = item.dimensions.width.valueM
  const h = item.dimensions.height.valueM
  const d = item.dimensions.depth.valueM
  const material = <Material color={item.color} selected={selected} />
  const common = { castShadow: true, receiveShadow: true, onClick: onSelect }

  return (
    <group
      position={[item.position.xM, item.position.yM, item.position.zM]}
      rotation={[0, (item.rotationYDeg * Math.PI) / 180, 0]}
    >
      {item.kind === 'sofa' && (
        <>
          <mesh {...common} position={[0, h * 0.32, 0]} scale={[w, h * 0.4, d]}>
            <boxGeometry />
            {material}
          </mesh>
          <mesh {...common} position={[0, h * 0.67, d * 0.35]} scale={[w, h * 0.6, d * 0.18]}>
            <boxGeometry />
            {material}
          </mesh>
          {[-1, 1].map((side) => (
            <mesh
              {...common}
              key={side}
              position={[side * w * 0.45, h * 0.58, 0]}
              scale={[w * 0.1, h * 0.5, d]}
            >
              <boxGeometry />
              {material}
            </mesh>
          ))}
        </>
      )}
      {item.kind === 'table' && (
        <>
          <mesh {...common} position={[0, h * 0.88, 0]} scale={[w, h * 0.18, d]}>
            <boxGeometry />
            {material}
          </mesh>
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <mesh
                {...common}
                key={`${x}-${z}`}
                position={[x * w * 0.42, h * 0.42, z * d * 0.38]}
                scale={[0.06, h * 0.84, 0.06]}
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
          <mesh {...common} position={[0, h * 0.48, 0]} scale={[w, h * 0.12, d]}>
            <boxGeometry />
            {material}
          </mesh>
          <mesh {...common} position={[0, h * 0.75, d * 0.42]} scale={[w, h * 0.5, d * 0.12]}>
            <boxGeometry />
            {material}
          </mesh>
          {[-1, 1].flatMap((x) =>
            [-1, 1].map((z) => (
              <mesh
                {...common}
                key={`${x}-${z}`}
                position={[x * w * 0.4, h * 0.22, z * d * 0.4]}
                scale={[0.045, h * 0.44, 0.045]}
              >
                <boxGeometry />
                {material}
              </mesh>
            )),
          )}
        </>
      )}
      {item.kind === 'cabinet' && (
        <mesh {...common} position={[0, h / 2, 0]} scale={[w, h, d]}>
          <boxGeometry />
          {material}
        </mesh>
      )}
      {item.kind === 'bed' && (
        <>
          <mesh {...common} position={[0, h * 0.25, 0]} scale={[w, h * 0.5, d]}>
            <boxGeometry />
            {material}
          </mesh>
          <mesh {...common} position={[0, h * 0.63, -d * 0.46]} scale={[w, h * 0.75, d * 0.08]}>
            <boxGeometry />
            {material}
          </mesh>
        </>
      )}
    </group>
  )
}

function Scene({ project, selectedId, mode, sunHour, onSelect }: RoomSceneProps) {
  const width = project.room.dimensions.width.valueM
  const height = project.room.dimensions.height.valueM
  const depth = project.room.dimensions.depth.valueM
  const angle = ((sunHour - 6) / 12) * Math.PI
  const sunPosition: [number, number, number] = [
    Math.cos(angle) * 7,
    Math.max(0.5, Math.sin(angle) * 8),
    -4,
  ]

  return (
    <>
      <color attach="background" args={['#0b121d']} />
      <fog attach="fog" args={['#0b121d', 10, 22]} />
      <PerspectiveCamera makeDefault position={[6.5, 5.2, 7]} fov={42} />
      <ambientLight intensity={mode === 'sun' ? 0.48 : 0.82} />
      <hemisphereLight args={['#bdefff', '#152233', 1.1]} />
      <directionalLight
        castShadow
        position={mode === 'sun' ? sunPosition : [4, 7, 3]}
        intensity={mode === 'sun' ? 3.2 : 1.8}
        color={mode === 'sun' ? '#ffd39a' : '#d7f7ff'}
        shadow-mapSize={[1024, 1024]}
      />

      <group onClick={() => onSelect(null)}>
        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.025, 0]}>
          <planeGeometry args={[width, depth]} />
          <meshStandardMaterial color="#172332" roughness={0.86} />
        </mesh>
        <mesh receiveShadow position={[0, height / 2, -depth / 2]}>
          <boxGeometry args={[width, height, 0.06]} />
          <meshStandardMaterial color="#233144" roughness={0.92} side={2} />
        </mesh>
        <mesh receiveShadow position={[-width / 2, height / 2, 0]}>
          <boxGeometry args={[0.06, height, depth]} />
          <meshStandardMaterial color="#1d2a3b" roughness={0.92} side={2} />
        </mesh>
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
        fadeDistance={12}
        infiniteGrid={false}
      />

      {project.furniture.map((item) => (
        <FurnitureMesh
          key={item.id}
          item={item}
          selected={item.id === selectedId}
          onSelect={(event) => {
            event.stopPropagation()
            onSelect(item.id)
          }}
        />
      ))}
      <ContactShadows
        position={[0, 0.012, 0]}
        opacity={0.42}
        scale={Math.max(width, depth) * 1.4}
        blur={2.4}
        far={4}
      />
      <OrbitControls
        makeDefault
        target={[0, Math.min(height * 0.35, 1.1), 0]}
        minDistance={3}
        maxDistance={14}
        maxPolarAngle={Math.PI / 2.03}
      />
    </>
  )
}

export function RoomScene(props: RoomSceneProps) {
  return (
    <Canvas shadows dpr={[1, 1.75]} gl={{ antialias: true }}>
      <Suspense fallback={null}>
        <Scene {...props} />
      </Suspense>
    </Canvas>
  )
}
