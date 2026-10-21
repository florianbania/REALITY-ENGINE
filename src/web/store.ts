import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  DigitalTwinProject,
  DimensionKey,
  FurnitureKind,
  MeasurementSource,
  Orientation3D,
  Position3D,
  SunSettings,
} from '../core/model'
import { migrateProjectValue, validateProject } from '../core/project-io'
import {
  createFurniture,
  createStarterProject,
  updateFurnitureMeasurement,
  updateRoomMeasurement,
} from '../core/project'
import type { ScanApplyResult, ScanDocument } from '../scan/contracts'
import { applyScanDocument } from '../scan/document'

export type WorkspaceMode = 'fit' | 'sun' | 'space' | 'scan'

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
  duplicateFurniture: (id: string) => void
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
  updateFurnitureOrientation: (id: string, orientation: Orientation3D) => void
  updateFurnitureTransform: (
    id: string,
    position: Position3D,
    orientation: Orientation3D,
  ) => void
  updateFurnitureClearance: (id: string, minimumClearanceM: number) => void
  updateSunSettings: (settings: Partial<SunSettings>) => void
  applyScan: (document: ScanDocument, now?: string) => ScanApplyResult
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
      duplicateFurniture: (id) => {
        const source = get()
          .projects.find((project) => project.id === get().activeProjectId)
          ?.furniture.find((item) => item.id === id)
        if (!source) return
        const duplicate = {
          ...source,
          id: crypto.randomUUID(),
          name: `${source.name} Kopie`,
          position: {
            ...source.position,
            xM: source.position.xM + 0.25,
            zM: source.position.zM + 0.25,
          },
          dimensions: {
            width: { ...source.dimensions.width },
            height: { ...source.dimensions.height },
            depth: { ...source.dimensions.depth },
          },
          orientation: { ...source.orientation },
        }
        set((state) => ({
          ...updateActive(state, (project) => ({
            ...project,
            furniture: [...project.furniture, duplicate],
            updatedAt: new Date().toISOString(),
          })),
          selectedFurnitureId: duplicate.id,
        }))
      },
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
              item.id === id
                ? {
                    ...item,
                    orientation: { ...item.orientation, rotationYDeg },
                  }
                : item,
            ),
          })),
        ),
      updateFurnitureOrientation: (id, orientation) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            updatedAt: new Date().toISOString(),
            furniture: project.furniture.map((item) =>
              item.id === id ? { ...item, orientation } : item,
            ),
          })),
        ),
      updateFurnitureTransform: (id, position, orientation) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            updatedAt: new Date().toISOString(),
            furniture: project.furniture.map((item) =>
              item.id === id ? { ...item, position, orientation } : item,
            ),
          })),
        ),
      updateFurnitureClearance: (id, minimumClearanceM) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            updatedAt: new Date().toISOString(),
            furniture: project.furniture.map((item) =>
              item.id === id ? { ...item, minimumClearanceM } : item,
            ),
          })),
        ),
      updateSunSettings: (settings) =>
        set((state) =>
          updateActive(state, (project) => ({
            ...project,
            updatedAt: new Date().toISOString(),
            sun: { ...project.sun, ...settings },
          })),
        ),
      applyScan: (document, now = new Date().toISOString()) => {
        const state = get()
        const current =
          state.projects.find((project) => project.id === state.activeProjectId) ??
          state.projects[0]
        const result = applyScanDocument(current, document, now)
        if (result.project !== current) {
          set({
            projects: state.projects.map((project) =>
              project.id === current.id ? result.project : project,
            ),
          })
        }
        return result
      },
    }),
    {
      name: 'reality-engine-projects-v1',
      version: 4,
      migrate: (persistedState) => {
        const persisted = persistedState as Partial<ProjectState>
        const migratedProjects = (persisted.projects ?? [])
          .map((project) => {
            try {
              return validateProject(migrateProjectValue(project))
            } catch {
              return null
            }
          })
          .filter((project): project is DigitalTwinProject => project !== null)
        const projects = migratedProjects.length > 0 ? migratedProjects : [initialProject]
        const activeProjectId = projects.some(
          (project) => project.id === persisted.activeProjectId,
        )
          ? persisted.activeProjectId!
          : projects[0].id
        return { ...persisted, projects, activeProjectId }
      },
      partialize: (state) => ({
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      }),
    },
  ),
)

export function getActiveProject(state: ProjectState): DigitalTwinProject {
  return (
    state.projects.find((project) => project.id === state.activeProjectId) ??
    state.projects[0] ??
    initialProject
  )
}
