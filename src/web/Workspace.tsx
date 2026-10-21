import {
  ArrowLeft,
  Box,
  ChevronDown,
  Download,
  Layers3,
  Plus,
  Ruler,
  ScanLine,
  Sun,
  Trash2,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import { importProject, exportProject, ProjectFormatError } from '../core/project-io'
import type { FurnitureKind, Position3D } from '../core/model'
import { formatLength } from '../core/units'
import { calculateSpaceMetrics } from '../simulation/space-metrics'
import { MeasurementField } from './MeasurementField'
import { RoomScene } from './RoomScene'
import { getActiveProject, useProjectStore, type WorkspaceMode } from './store'

const modes: { id: WorkspaceMode; label: string; icon: typeof Ruler }[] = [
  { id: 'fit', label: 'FIT', icon: Ruler },
  { id: 'sun', label: 'SUN', icon: Sun },
  { id: 'space', label: 'SPACE', icon: Layers3 },
]

const furnitureOptions: { kind: FurnitureKind; label: string }[] = [
  { kind: 'sofa', label: 'Sofa' },
  { kind: 'table', label: 'Tisch' },
  { kind: 'chair', label: 'Stuhl' },
  { kind: 'cabinet', label: 'Schrank' },
  { kind: 'bed', label: 'Bett' },
]

export function Workspace() {
  const store = useProjectStore()
  const project = getActiveProject(store)
  const selected = project.furniture.find((item) => item.id === store.selectedFurnitureId) ?? null
  const metrics = calculateSpaceMetrics(project)
  const [sunHour, setSunHour] = useState(14)
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([exportProject(project)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = `${project.name.toLowerCase().replace(/[^a-z0-9äöü]+/gi, '-')}.reality.json`
    anchor.click()
    URL.revokeObjectURL(url)
    setNotice('Projektdatei wurde exportiert.')
  }

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      store.importProject(importProject(await file.text()))
      setNotice(`„${file.name}“ wurde erfolgreich importiert.`)
    } catch (error) {
      setNotice(
        error instanceof ProjectFormatError
          ? error.issues[0]
          : 'Die Projektdatei konnte nicht gelesen werden.',
      )
    } finally {
      event.target.value = ''
    }
  }

  const updatePosition = (axis: keyof Position3D, value: number) => {
    if (!selected || !Number.isFinite(value)) return
    store.updateFurniturePosition(selected.id, { ...selected.position, [axis]: value })
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <button
          className="icon-button"
          type="button"
          onClick={store.leaveWorkspace}
          aria-label="Zur Startseite"
        >
          <ArrowLeft size={19} />
        </button>
        <div className="workspace-brand">
          <span className="wordmark__mark">RE</span>
          <span>REALITY ENGINE</span>
        </div>
        <div className="mode-tabs" aria-label="Arbeitsmodus">
          {modes.map(({ id, label, icon: Icon }) => (
            <button
              type="button"
              key={id}
              className={store.mode === id ? 'active' : ''}
              onClick={() => store.setMode(id)}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <button type="button" className="disabled" disabled title="In einer späteren Phase">
            <ScanLine size={16} />
            SCAN
            <sup>später</sup>
          </button>
        </div>
        <span className="save-state">
          <i />
          Lokal gespeichert
        </span>
      </header>

      <div className="workspace-grid">
        <aside className="project-rail">
          <div className="panel-heading">
            <span>Projekte</span>
            <button
              className="mini-button"
              type="button"
              onClick={store.createProject}
              aria-label="Neues Projekt"
            >
              <Plus size={16} />
            </button>
          </div>
          <div className="project-list">
            {store.projects.map((item, index) => (
              <button
                type="button"
                key={item.id}
                className={`project-item ${item.id === project.id ? 'active' : ''}`}
                onClick={() => store.selectProject(item.id)}
              >
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{item.name}</strong>
                <small>{item.room.name}</small>
              </button>
            ))}
          </div>
          <div className="project-actions">
            <input
              ref={fileInput}
              type="file"
              accept=".json,.reality.json,application/json"
              onChange={handleImport}
              hidden
            />
            <button type="button" onClick={() => fileInput.current?.click()}>
              <Upload size={15} /> Import
            </button>
            <button type="button" onClick={handleExport}>
              <Download size={15} /> Export
            </button>
          </div>
          <div className="schema-label">
            <span>Schema</span>
            <strong>project@{project.schemaVersion}</strong>
          </div>
        </aside>

        <section className="viewport">
          <div className="viewport-topbar">
            <div>
              <span className="viewport-label">Aktiver Zwilling</span>
              <input
                className="project-title-input"
                value={project.name}
                onChange={(event) => store.renameProject(event.target.value)}
                aria-label="Projektname"
              />
            </div>
            <div className="dimension-summary">
              <span>{formatLength(project.room.dimensions.width.valueM)}</span>
              <b>×</b>
              <span>{formatLength(project.room.dimensions.depth.valueM)}</span>
              <b>×</b>
              <span>{formatLength(project.room.dimensions.height.valueM)}</span>
            </div>
          </div>
          <div className="canvas-shell">
            <RoomScene
              project={project}
              selectedId={store.selectedFurnitureId}
              mode={store.mode}
              sunHour={sunHour}
              onSelect={store.selectFurniture}
            />
            <div className="canvas-hint">Ziehen zum Drehen · Scrollen zum Zoomen</div>
            {store.mode === 'sun' && (
              <div className="sun-control floating-card">
                <div>
                  <Sun size={17} />
                  <span>Lichtvorschau</span>
                  <strong>{sunHour}:00</strong>
                </div>
                <input
                  type="range"
                  min="6"
                  max="18"
                  value={sunHour}
                  onChange={(event) => setSunHour(Number(event.target.value))}
                  aria-label="Uhrzeit der Lichtvorschau"
                />
                <small>Visuelle Vorschau, noch keine standortbasierte Sonnensimulation.</small>
              </div>
            )}
            {store.mode === 'space' && (
              <div className="metrics floating-card">
                <Metric label="Raumfläche" value={`${metrics.floorAreaM2.toFixed(1)} m²`} />
                <Metric label="Freie Fläche*" value={`${metrics.freeAreaM2.toFixed(1)} m²`} />
                <Metric label="Belegung*" value={`${metrics.occupancyPercent.toFixed(0)} %`} />
                <small>* Rechteckige Grundflächen; Überlappungen werden nicht abgezogen.</small>
              </div>
            )}
            {store.mode === 'fit' && (
              <div className="add-furniture">
                <button
                  type="button"
                  onClick={() => setShowAddMenu((value) => !value)}
                  aria-expanded={showAddMenu}
                >
                  <Plus size={17} /> Möbel hinzufügen <ChevronDown size={15} />
                </button>
                {showAddMenu && (
                  <div className="add-menu">
                    {furnitureOptions.map(({ kind, label }) => (
                      <button
                        key={kind}
                        type="button"
                        onClick={() => {
                          store.addFurniture(kind)
                          setShowAddMenu(false)
                        }}
                      >
                        <Box size={14} /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="inspector">
          <div className="panel-heading">
            <span>{selected ? 'Möbelobjekt' : 'Raum'}</span>
            {selected && (
              <button
                className="mini-button danger"
                type="button"
                onClick={() => store.removeFurniture(selected.id)}
                aria-label="Möbel entfernen"
              >
                <Trash2 size={15} />
              </button>
            )}
          </div>
          <div className="inspector-scroll">
            {selected ? (
              <>
                <div className="object-type">
                  <span className="object-swatch" style={{ background: selected.color }} />
                  <div>
                    <strong>{selected.name}</strong>
                    <span>Parametrisch · {selected.kind}</span>
                  </div>
                </div>
                <h3>Abmessungen</h3>
                {(['width', 'depth', 'height'] as const).map((key) => (
                  <MeasurementField
                    key={key}
                    label={{ width: 'Breite', depth: 'Tiefe', height: 'Höhe' }[key]}
                    measurement={selected.dimensions[key]}
                    onCommit={(value, uncertainty) =>
                      store.updateFurnitureDimension(selected.id, key, value, uncertainty)
                    }
                  />
                ))}
                <h3>Position im Raum</h3>
                <div className="axis-grid">
                  {(['xM', 'zM'] as const).map((axis) => (
                    <label key={axis}>
                      {axis === 'xM' ? 'X' : 'Z'} <span>m</span>
                      <input
                        type="number"
                        step="0.05"
                        value={selected.position[axis]}
                        onChange={(event) => updatePosition(axis, Number(event.target.value))}
                      />
                    </label>
                  ))}
                  <label>
                    Drehung <span>°</span>
                    <input
                      type="number"
                      step="5"
                      value={selected.orientation.rotationYDeg}
                      onChange={(event) =>
                        store.updateFurnitureRotation(selected.id, Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              </>
            ) : (
              <>
                <label className="text-field">
                  Raumname
                  <input
                    value={project.room.name}
                    onChange={(event) => store.renameRoom(event.target.value)}
                  />
                </label>
                <h3>Innenmaße</h3>
                {(['width', 'depth', 'height'] as const).map((key) => (
                  <MeasurementField
                    key={key}
                    label={{ width: 'Breite', depth: 'Tiefe', height: 'Höhe' }[key]}
                    measurement={project.room.dimensions[key]}
                    onCommit={(value, uncertainty) =>
                      store.updateRoomDimension(key, value, uncertainty)
                    }
                  />
                ))}
                <div className="info-note">
                  <Ruler size={17} />
                  <p>
                    Alle Werte werden intern in Metern gespeichert. Jede Änderung aktualisiert
                    Quelle, Unsicherheit und Zeitstempel.
                  </p>
                </div>
              </>
            )}
          </div>
          <div className="inspector-footer">
            <span>{project.furniture.length} Objekte</span>
            <button
              type="button"
              disabled={store.projects.length === 1}
              onClick={store.deleteActiveProject}
            >
              Projekt löschen
            </button>
          </div>
        </aside>
      </div>

      {notice && (
        <button className="toast" type="button" onClick={() => setNotice(null)}>
          {notice}
        </button>
      )}
    </main>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}
