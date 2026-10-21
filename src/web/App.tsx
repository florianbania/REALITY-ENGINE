import { Landing } from './Landing'
import { useProjectStore } from './store'
import { Workspace } from './Workspace'

export function App() {
  const hasEnteredWorkspace = useProjectStore((state) => state.hasEnteredWorkspace)
  const enterWorkspace = useProjectStore((state) => state.enterWorkspace)
  const projectCount = useProjectStore((state) => state.projects.length)

  if (hasEnteredWorkspace) return <Workspace />

  return (
    <Landing
      onEnter={enterWorkspace}
      onOpenProjects={() => enterWorkspace('fit')}
      projectCount={projectCount}
    />
  )
}
