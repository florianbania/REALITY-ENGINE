import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DigitalTwinProject,
  DimensionKey,
  FurnitureKind,
  MeasurementSource,
  Position3D,
} from '../core/model'
import {
  createFurniture,
  createStarterProject,
  updateFurnitureMeasurement,
  updateRoomMeasurement,
} from '../core/project'

export type WorkspaceMode = 'fit' | 'sun' | 'space'

interface ProjectState {
  projects: DigitalTwinProject[]
  activeProjectId: string
  selectedFurnitureId: string | null
  mode: WorkspaceMode
  hasEnteredWorkspace: boolean
  setMode: (mode: WorkspaceMode) => void
  enterWorkspace: (mode: WorkspaceMode) => void
  leaveWorkspace: () => void
  createProject: () => void
  importProject: (project: DigitalTwinProject) => void
  selectProject: (projectId: string) => void
  renameProject: (name: string) => void
  renameRoom: (name: string) => void
  deleteActiveProject: () => void
  selectFurniture: (id: string | null) => void
  addFurniture: (kind: FurnitureKind) => void
  removeFurniture: (id: string) => void
  updateRoomDimension: (
    dimension: DimensionKey,
    valueM: number,
    uncertaintyM: number,
    source?: MeasurementSource,
  ) => void
  updateFurnitureDimension: (
    id: string,
    dimension: DimensionKey,
    valueM: number,
    uncertaintyM: number,
    source?: MeasurementSource,
  ) => void
  updateFurniturePosition: (id: string, position: Position3D) => void
  updateFurnitureRotation: (id: string, rotationYDeg: number) => void
}

const initialProject = createStarterProject()

function updateActive(
  state: ProjectState,
  transform: (project: DigitalTwinProject) => DigitalTwinProject,
): Pick<ProjectState, 'projects'> {
  return {
    projects: state.projects.map((project) =>
      project.id === state.activeProjectId ? transform(project) : project,
    ),
  }
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [initialProject],
      activeProjectId: initialProject.id,
      selectedFurnitureId: null,
      mode: 'fit',
      hasEnteredWorkspace: false,
      setMode: (mode) => set({ mode }),
      enterWorkspace: (mode) => set({ mode, hasEnteredWorkspace: true }),
      leaveWorkspace: () => set({ hasEnteredWorkspace: false, selectedFurnitureId: null }),
      createProject: () => {
        const project = createStarterProject()
        set((state) => ({
          projects: [...state.projects, project],
          activeProjectId: project.id,
          selectedFurnitureId: null,
          hasEnteredWorkspace: true,
        }))
      },
      importProject: (project) =>
        set((state) => ({
          projects: [...state.projects.filter((item) => item.id !== project.id), project],
          activeProjectId: project.id,
          selectedFurnitureId: null,
          hasEnteredWorkspace: true,
        })),
      selectProject: (activeProjectId) =>
        set({ activeProjectId, selectedFurnitureId: null }),
      renameProject: (name) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            name,
            updatedAt: new Date().toISOString(),
          })),
        ),
      renameRoom: (name) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            room: { ...project.room, name },
            updatedAt: new Date().toISOString(),
          })),
        ),
      deleteActiveProject: () => {
        const state = get()
        if (state.projects.length === 1) return
        const projects = state.projects.filter((project) => project.id !== state.activeProjectId)
        set({
          projects,
          activeProjectId: projects[0].id,
          selectedFurnitureId: null,
        })
      },
      selectFurniture: (selectedFurnitureId) => set({ selectedFurnitureId }),
      addFurniture: (kind) => {
        const names: Record<FurnitureKind, string> = {
          sofa: 'Sofa',
          table: 'Tisch',
          chair: 'Stuhl',
          cabinet: 'Schrank',
          bed: 'Bett',
        }
        const item = createFurniture(kind, names[kind])
        set((state) => ({
          ...updateActive(state, (project) => ({
            ...project,
            furniture: [...project.furniture, item],
            updatedAt: new Date().toISOString(),
          })),
          selectedFurnitureId: item.id,
        }))
      },
      removeFurniture: (id) =>
        set((state) => ({
          ...updateActive(state, (project) => ({
            ...project,
            furniture: project.furniture.filter((item) => item.id !== id),
            updatedAt: new Date().toISOString(),
          })),
          selectedFurnitureId: state.selectedFurnitureId === id ? null : state.selectedFurnitureId,
        })),
      updateRoomDimension: (dimension, valueM, uncertaintyM, source = 'manual') =>
        set((state) =>
          updateActive(state, (project) =>
            updateRoomMeasurement(project, dimension, valueM, uncertaintyM, source),
          ),
        ),
      updateFurnitureDimension: (
        id,
        dimension,
        valueM,
        uncertaintyM,
        source = 'manual',
      ) =>
        set((state) =>
          updateActive(state, (project) =>
            updateFurnitureMeasurement(
              project,
              id,
              dimension,
              valueM,
              uncertaintyM,
              source,
            ),
          ),
        ),
      updateFurniturePosition: (id, position) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            updatedAt: new Date().toISOString(),
            furniture: project.furniture.map((item) =>
              item.id === id ? { ...item, position } : item,
            ),
          })),
        ),
      updateFurnitureRotation: (id, rotationYDeg) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            updatedAt: new Date().toISOString(),
            furniture: project.furniture.map((item) =>
              item.id === id ? { ...item, rotationYDeg } : item,
            ),
          })),
        ),
    }),
    {
      name: 'reality-engine-projects-v1',
      version: 1,
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    },
  ),
)

export function getActiveProject(state: ProjectState): DigitalTwinProject {
  return (
    state.projects.find((project) => project.id === state.activeProjectId) ?? state.projects[0]
  )
}
