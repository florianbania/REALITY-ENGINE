import { lazy, Suspense } from 'react'
import { Landing } from './Landing'
import { useProjectStore } from './store'

const Workspace = lazy(() =>
  import('./Workspace').then((module) => ({ default: module.Workspace })),
)

export function App() {
  const hasEnteredWorkspace = useProjectStore((state) => state.hasEnteredWorkspace)
  const enterWorkspace = useProjectStore((state) => state.enterWorkspace)
  const projectCount = useProjectStore((state) => state.projects.length)

  if (hasEnteredWorkspace) {
    return (
      <Suspense fallback={<div className="app-loading">3D-Raum wird vorbereitet …</div>}>
        <Workspace />
      </Suspense>
    )
  }

  return (
    <Landing
      onEnter={enterWorkspace}
      onOpenProjects={() => enterWorkspace('fit')}
      projectCount={projectCount}
    />
  )
}
