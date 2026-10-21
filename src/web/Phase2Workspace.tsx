import {
  ArrowLeft,
  Box,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  Download,
  Grid2X2,
  Layers3,
  Move3d,
  Pause,
  Play,
  Plus,
  Rotate3d,
  Ruler,
  ScanLine,
  Sun,
  Trash2,
  Upload,
  View,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type {
  FurnitureKind,
  FurnitureObject,
  Orientation3D,
  Position3D,
  SunSettings,
} from '../core/model'
import { exportProject, importProject, ProjectFormatError } from '../core/project-io'
import { formatLength } from '../core/units'
import {
  checkTransportPath,
  placementStatus,
  type PathCheckResult,
  type Point2,
  type TransformDraft,
} from '../simulation/collision'
import { calculateSpaceMetrics } from '../simulation/space-metrics'
import { addLocalMinutes, calculateSunForProject, type SunResult } from '../simulation/sun'
import { MeasurementField } from './MeasurementField'
import {
  PlannerScene,
  type TransformMode,
  type ViewMode,
} from './PlannerScene'
import { ScanPanel } from './ScanPanel'
import { getActiveProject, useProjectStore, type WorkspaceMode } from './store'

const modes: { id: WorkspaceMode; label: string; icon: typeof Ruler }[] = [
  { id: 'fit', label: 'FIT', icon: Ruler },
  { id: 'sun', label: 'SUN', icon: Sun },
  { id: 'space', label: 'SPACE', icon: Layers3 },
  { id: 'scan', label: 'SCAN', icon: ScanLine },
]

const furnitureOptions: { kind: FurnitureKind; label: string }[] = [
  { kind: 'sofa', label: 'Sofa' },
  { kind: 'table', label: 'Tisch' },
  { kind: 'chair', label: 'Stuhl' },
  { kind: 'cabinet', label: 'Schrank' },
  { kind: 'bed', label: 'Bett' },
]

const FIT_STATUS_COPY: Record<PathCheckResult['status'], [string, string]> = {
  clear: ['Pfad geprüft: frei', 'Kein Hindernis in den geprüften Stützstellen.'],
  collision: ['Kollision erkannt', 'Eine OBB überschneidet ein anderes Möbelobjekt.'],
  clearance: [
    'Mindestabstand unterschritten',
    'Keine Berührung, aber der hinterlegte Sicherheitsabstand ist zu klein.',
  ],
  'outside-room': ['Außerhalb des Raums', 'Mindestens eine Ecke verlässt die Raumhülle.'],
  'door-blocked': ['Türfreizone blockiert', 'Der konservative Türbereich wird geschnitten.'],
}

function resultCopy(result: PathCheckResult | null) {
  if (!result) {
    return {
      title: 'Noch nicht geprüft',
      detail: 'Die Anwendung trifft vor der expliziten Prüfung keine Aussage.',
      tone: 'unchecked',
    }
  }
  const copy = FIT_STATUS_COPY[result.status]
  const startNote =
    result.startStatus === 'clear'
      ? ''
      : ` Startzustand: ${FIT_STATUS_COPY[result.startStatus][0]}.`
  return {
    title: copy[0],
    detail: `${copy[1]}${startNote} ${result.checkedSamples} Stützstellen, max. ${Math.round(result.sampleStepM * 100)} cm, Interpolation ${result.interpolation}. Keine Wegsuche.`,
    tone: result.status === 'clear' ? 'clear' : 'issue',
  }
}

function FitTransportPanel({
  projectId,
  item,
  project,
  onApply,
}: {
  projectId: string
  item: FurnitureObject
  project: ReturnType<typeof getActiveProject>
  onApply: (position: Position3D, orientation: Orientation3D) => void
}) {
  const [target, setTarget] = useState<TransformDraft>({
    position: { ...item.position },
    orientation: { ...item.orientation },
  })
  const [result, setResult] = useState<PathCheckResult | null>(null)
  const copy = resultCopy(result)
  const updatePosition = (key: keyof Position3D, value: number) => {
    setTarget((current) => ({
      ...current,
      position: { ...current.position, [key]: value },
    }))
    setResult(null)
  }
  const updateOrientation = (key: keyof Orientation3D, value: number) => {
    setTarget((current) => ({
      ...current,
      orientation: { ...current.orientation, [key]: value },
    }))
    setResult(null)
  }
  return (
    <div className="fit-check" data-project={projectId}>
      <h3>Manueller Transportpfad</h3>
      <p className="panel-copy">
        Linearer kürzester Yaw-Pfad vom aktuellen Zustand zum Ziel – einschließlich Drehung und
        Kippung. Es findet keine automatische 3D-Wegsuche statt.
      </p>
      <div className="transform-grid">
        {(['xM', 'yM', 'zM'] as const).map((axis) => (
          <label key={axis}>
            Ziel {axis[0].toUpperCase()} <span>m</span>
            <input
              type="number"
              step="0.05"
              value={target.position[axis]}
              onChange={(event) => updatePosition(axis, Number(event.target.value))}
            />
          </label>
        ))}
        {(
          [
            ['rotationYDeg', 'Drehen Y'],
            ['tiltXDeg', 'Kippen X'],
            ['tiltZDeg', 'Kippen Z'],
          ] as const
        ).map(([key, label]) => (
          <label key={key}>
            {label} <span>°</span>
            <input
              type="number"
              step="5"
              value={target.orientation[key]}
              onChange={(event) => updateOrientation(key, Number(event.target.value))}
            />
          </label>
        ))}
      </div>
      <button
        className="primary-action"
        type="button"
        onClick={() => setResult(checkTransportPath(project, item.id, target, 0.02))}
      >
        <Ruler size={15} /> Gesamten Pfad prüfen
      </button>
      <div className={`fit-result fit-result--${copy.tone}`}>
        {copy.tone === 'clear' ? <CheckCircle2 size={18} /> : <CircleAlert size={18} />}
        <div>
          <strong>{copy.title}</strong>
          <span>{copy.detail}</span>
        </div>
      </div>
      <button
        className="secondary-action"
        type="button"
        disabled={result?.status !== 'clear'}
        onClick={() => onApply(target.position, target.orientation)}
      >
        Geprüftes Ziel anwenden
      </button>
    </div>
  )
}

function SunControls({
  settings,
  result,
  error,
  onChange,
}: {
  settings: SunSettings
  result: SunResult | null
  error: string | null
  onChange: (settings: Partial<SunSettings>) => void
}) {
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => {
      onChange({ localDateTime: addLocalMinutes(settings.localDateTime, 15) })
    }, 500)
    return () => window.clearInterval(timer)
  }, [onChange, playing, settings.localDateTime])

  return (
    <div className="sun-settings">
      <div className="sun-settings__grid">
        <label>
          Breitengrad
          <input
            type="number"
            min="-90"
            max="90"
            step="0.0001"
            value={settings.latitude}
            onChange={(event) => onChange({ latitude: Number(event.target.value) })}
          />
        </label>
        <label>
          Längengrad
          <input
            type="number"
            min="-180"
            max="180"
            step="0.0001"
            value={settings.longitude}
            onChange={(event) => onChange({ longitude: Number(event.target.value) })}
          />
        </label>
        <label className="wide">
          Datum & lokale Uhrzeit
          <input
            type="datetime-local"
            value={settings.localDateTime}
            onChange={(event) => onChange({ localDateTime: event.target.value })}
          />
        </label>
        <label className="wide">
          IANA-Zeitzone
          <input
            value={settings.timeZone}
            onChange={(event) => onChange({ timeZone: event.target.value })}
            placeholder="Europe/Berlin"
          />
        </label>
        <label className="wide">
          Nordausrichtung des Raums <span>{settings.northOffsetDeg}°</span>
          <input
            type="range"
            min="0"
            max="359"
            value={settings.northOffsetDeg}
            onChange={(event) => onChange({ northOffsetDeg: Number(event.target.value) })}
          />
        </label>
      </div>
      <button className="primary-action" type="button" onClick={() => setPlaying((value) => !value)}>
        {playing ? <Pause size={15} /> : <Play size={15} />}
        {playing ? 'Animation anhalten' : 'Tagesverlauf abspielen'}
      </button>
      {error && <div className="sun-error">{error}</div>}
      {result && (
        <div className="solar-facts">
          <Fact label="Sonnenhöhe" value={`${result.altitudeDeg.toFixed(1)}°`} />
          <Fact label="Azimut ab Nord" value={`${result.azimuthNorthDeg.toFixed(1)}°`} />
          <Fact label="Zeitzone / DST" value={result.zoneLabel} />
          <Fact
            label="Auf- / Untergang"
            value={`${result.sunriseLabel ?? '—'} / ${result.sunsetLabel ?? '—'}`}
          />
          <Fact
            label="Raum-Nord (−Z)"
            value={`${settings.northOffsetDeg}° Versatz zu geogr. Nord`}
          />
          <Fact
            label="Direkt beleuchtete Öffnungen"
            value={
              result.illuminatedOpeningIds.length === 0
                ? 'keine (Sonne unter Horizont oder Wand abgewandt)'
                : String(result.illuminatedOpeningIds.length)
            }
          />
        </div>
      )}
      <p className="limitation">
        SunCalc liefert die astronomische Sonnenposition. Lichtwege sind nur die
        modellierten Fenster/Öffnungen, wenn der Lichtvektor die Innen-Normale trifft.
        Wetter, Bewölkung, Gelände, Nachbargebäude, Glasoptik und diffuse
        Himmelsstrahlung werden nicht erfunden.
      </p>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

export function Phase2Workspace() {
  const store = useProjectStore()
  const project = getActiveProject(store)
  const selected =
    project.furniture.find((item) => item.id === store.selectedFurnitureId) ?? null
  const metrics = calculateSpaceMetrics(project)
  const issueIds = project.furniture
    .filter((item) => placementStatus(project, item.id).status !== 'clear')
    .map((item) => item.id)
  const [viewMode, setViewMode] = useState<ViewMode>('3d')
  const [transformMode, setTransformMode] = useState<TransformMode>('translate')
  const [measurementActive, setMeasurementActive] = useState(false)
  const [measurementPoints, setMeasurementPoints] = useState<Point2[]>([])
  const [showAddMenu, setShowAddMenu] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  let sunResult: SunResult | null = null
  let sunError: string | null = null
  try {
    sunResult = calculateSunForProject(project)
  } catch (error) {
    sunError = error instanceof Error ? error.message : 'Sonnenstand konnte nicht berechnet werden.'
  }

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

  const setMode = (mode: WorkspaceMode) => {
    store.setMode(mode)
    setMeasurementActive(false)
    setMeasurementPoints([])
    if (mode === 'sun') setViewMode('3d')
  }

  const addMeasurePoint = (point: Point2) => {
    setMeasurementPoints((current) => (current.length >= 2 ? [point] : [...current, point]))
  }

  const updatePosition = (axis: keyof Position3D, value: number) => {
    if (!selected || !Number.isFinite(value)) return
    store.updateFurniturePosition(selected.id, { ...selected.position, [axis]: value })
  }

  const updateOrientation = (axis: keyof Orientation3D, value: number) => {
    if (!selected || !Number.isFinite(value)) return
    store.updateFurnitureOrientation(selected.id, { ...selected.orientation, [axis]: value })
  }

  return (
    <main className="workspace">
      <header className="workspace-header">
        <button className="icon-button" type="button" onClick={store.leaveWorkspace} aria-label="Zur Startseite">
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
              onClick={() => setMode(id)}
            >
              <Icon size={16} /> {label}
              {id === 'scan' && <sup>demo</sup>}
            </button>
          ))}
        </div>
        <span className="save-state"><i />Lokal gespeichert</span>
      </header>

      <div className="workspace-grid">
        <aside className="project-rail">
          <div className="panel-heading">
            <span>Projekte</span>
            <button className="mini-button" type="button" onClick={store.createProject} aria-label="Neues Projekt">
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
            <input ref={fileInput} type="file" accept=".json,.reality.json,application/json" onChange={handleImport} hidden />
            <button type="button" onClick={() => fileInput.current?.click()}><Upload size={15} /> Import</button>
            <button type="button" onClick={handleExport}><Download size={15} /> Export</button>
          </div>
          <div className="schema-label"><span>Schema</span><strong>project@{project.schemaVersion}</strong></div>
        </aside>

        <section className="viewport">
          <div className="viewport-topbar">
            <div>
              <span className="viewport-label">Aktiver Zwilling</span>
              <input className="project-title-input" value={project.name} onChange={(event) => store.renameProject(event.target.value)} />
            </div>
            <div className="planner-toolbar">
              {store.mode === 'space' && (
                <>
                  <button type="button" className={viewMode === 'plan' ? 'active' : ''} onClick={() => setViewMode('plan')}><Grid2X2 size={15} /> Grundriss</button>
                  <button type="button" className={viewMode === '3d' ? 'active' : ''} onClick={() => setViewMode('3d')}><View size={15} /> 3D</button>
                </>
              )}
              {store.mode !== 'sun' && store.mode !== 'scan' && (
                <>
                  <button type="button" className={transformMode === 'translate' && !measurementActive ? 'active' : ''} onClick={() => { setTransformMode('translate'); setMeasurementActive(false) }}><Move3d size={15} /> Bewegen</button>
                  <button type="button" className={transformMode === 'rotate' && !measurementActive ? 'active' : ''} onClick={() => { setTransformMode('rotate'); setMeasurementActive(false) }}><Rotate3d size={15} /> Drehen</button>
                </>
              )}
              {store.mode === 'space' && (
                <button type="button" className={measurementActive ? 'active' : ''} onClick={() => { setMeasurementActive((value) => !value); setMeasurementPoints([]) }}><Ruler size={15} /> Messen</button>
              )}
            </div>
            <div className="dimension-summary">
              <span>{formatLength(project.room.dimensions.width.valueM)}</span><b>×</b>
              <span>{formatLength(project.room.dimensions.depth.valueM)}</span><b>×</b>
              <span>{formatLength(project.room.dimensions.height.valueM)}</span>
            </div>
          </div>
          <div className="canvas-shell">
            <PlannerScene
              project={project}
              selectedId={store.selectedFurnitureId}
              mode={store.mode}
              viewMode={viewMode}
              transformMode={store.mode === 'sun' || store.mode === 'scan' ? 'none' : transformMode}
              collisionIds={issueIds}
              sun={sunResult}
              measurementActive={measurementActive}
              measurementPoints={measurementPoints}
              onMeasurePoint={addMeasurePoint}
              onSelect={store.selectFurniture}
              onTransform={store.updateFurnitureTransform}
            />
            <div className="canvas-hint">
              {measurementActive ? 'Zwei Punkte im Grundriss anklicken' : 'Objekt wählen · Gizmo ziehen · Ansicht mit Maus steuern'}
            </div>
            {store.mode === 'space' && (
              <div className="metrics metrics--phase2 floating-card">
                <Fact label="Freie Bodenfläche" value={`≈ ${metrics.freeAreaM2.toFixed(1)} m²`} />
                <Fact label="Kollisionen" value={String(metrics.collisionPairs.length)} />
                <Fact label="Blockierte Türen" value={String(metrics.blockedDoorIds.length)} />
                <small>
                  Union projizierter OBB-Flächen, am Raum geclippt, deterministisches{' '}
                  {Math.round(metrics.gridCellM * 100)}-cm-Raster — kein CAD-Boolean.
                </small>
              </div>
            )}
            {store.mode !== 'sun' && store.mode !== 'scan' && (
              <div className={`add-furniture ${store.mode === 'space' ? 'add-furniture--with-metrics' : ''}`}>
                <button type="button" onClick={() => setShowAddMenu((value) => !value)} aria-expanded={showAddMenu}>
                  <Plus size={17} /> Platzieren <ChevronDown size={15} />
                </button>
                {showAddMenu && (
                  <div className="add-menu">
                    {furnitureOptions.map(({ kind, label }) => (
                      <button key={kind} type="button" onClick={() => { store.addFurniture(kind); setShowAddMenu(false) }}>
                        <Box size={14} /> {label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {store.mode === 'sun' && sunResult && (
              <div className="sun-live floating-card">
                <Sun size={18} />
                <div><span>{sunResult.localLabel}</span><strong>{sunResult.isAboveHorizon ? `${sunResult.altitudeDeg.toFixed(1)}° über Horizont` : 'Sonne unter Horizont'}</strong></div>
              </div>
            )}
          </div>
        </section>

        <aside className="inspector">
          <div className="panel-heading">
            <span>
              {store.mode === 'sun'
                ? 'Sonnenmodell'
                : store.mode === 'scan'
                  ? 'Scan-Import'
                  : selected
                    ? 'Möbelobjekt'
                    : 'Raum'}
            </span>
            {selected && store.mode !== 'sun' && store.mode !== 'scan' && (
              <div className="heading-actions">
                <button className="mini-button" type="button" onClick={() => store.duplicateFurniture(selected.id)} aria-label="Duplizieren"><Copy size={15} /></button>
                <button className="mini-button danger" type="button" onClick={() => store.removeFurniture(selected.id)} aria-label="Löschen"><Trash2 size={15} /></button>
              </div>
            )}
          </div>
          <div className="inspector-scroll">
            {store.mode === 'sun' ? (
              <SunControls settings={project.sun} result={sunResult} error={sunError} onChange={store.updateSunSettings} />
            ) : store.mode === 'scan' ? (
              <ScanPanel project={project} onApply={store.applyScan} />
            ) : selected ? (
              <>
                <div className="object-type">
                  <span className="object-swatch" style={{ background: selected.color }} />
                  <div><strong>{selected.name}</strong><span>Parametrisch · {selected.kind}</span></div>
                </div>
                <h3>Abmessungen</h3>
                {(['width', 'depth', 'height'] as const).map((key) => (
                  <MeasurementField
                    key={key}
                    label={{ width: 'Breite', depth: 'Tiefe', height: 'Höhe' }[key]}
                    measurement={selected.dimensions[key]}
                    onCommit={(value, uncertainty) => store.updateFurnitureDimension(selected.id, key, value, uncertainty)}
                  />
                ))}
                <h3>Transformieren</h3>
                <div className="transform-grid">
                  {(['xM', 'yM', 'zM'] as const).map((axis) => (
                    <label key={axis}>{axis[0].toUpperCase()} <span>m</span>
                      <input type="number" step="0.05" value={selected.position[axis]} onChange={(event) => updatePosition(axis, Number(event.target.value))} />
                    </label>
                  ))}
                  {(
                    [['rotationYDeg', 'Drehen Y'], ['tiltXDeg', 'Kippen X'], ['tiltZDeg', 'Kippen Z']] as const
                  ).map(([axis, label]) => (
                    <label key={axis}>{label} <span>°</span>
                      <input type="number" step="5" value={selected.orientation[axis]} onChange={(event) => updateOrientation(axis, Number(event.target.value))} />
                    </label>
                  ))}
                </div>
                <label className="range-field">
                  Mindestabstand <strong>{Math.round(selected.minimumClearanceM * 100)} cm</strong>
                  <input type="range" min="0" max="50" step="1" value={selected.minimumClearanceM * 100} onChange={(event) => store.updateFurnitureClearance(selected.id, Number(event.target.value) / 100)} />
                </label>
                {store.mode === 'fit' && (
                  <FitTransportPanel
                    key={`${project.id}-${selected.id}`}
                    projectId={project.id}
                    item={selected}
                    project={project}
                    onApply={(position, orientation) => store.updateFurnitureTransform(selected.id, position, orientation)}
                  />
                )}
                {store.mode === 'space' && (
                  <div className={`placement-state ${issueIds.includes(selected.id) ? 'issue' : 'clear'}`}>
                    {issueIds.includes(selected.id) ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}
                    <span>{issueIds.includes(selected.id) ? 'Platzierung verletzt Raum-, Tür- oder Kollisionsregeln.' : 'Aktuelle Platzierung ist konfliktfrei.'}</span>
                  </div>
                )}
              </>
            ) : (
              <>
                <label className="text-field">Raumname<input value={project.room.name} onChange={(event) => store.renameRoom(event.target.value)} /></label>
                <h3>Innenmaße</h3>
                {(['width', 'depth', 'height'] as const).map((key) => (
                  <MeasurementField
                    key={key}
                    label={{ width: 'Breite', depth: 'Tiefe', height: 'Höhe' }[key]}
                    measurement={project.room.dimensions[key]}
                    onCommit={(value, uncertainty) => store.updateRoomDimension(key, value, uncertainty)}
                  />
                ))}
                <div className="door-summary">
                  <strong>
                    {project.doors.length} Türfreizone · {project.openings.length} Öffnungen
                  </strong>
                  <span>
                    Türen: konservatives Rechteck. Fenster sind Lichtwege, keine Wetterannahme.
                  </span>
                </div>
              </>
            )}
          </div>
          <div className="inspector-footer">
            <span>{project.furniture.length} Objekte</span>
            <button type="button" disabled={store.projects.length === 1} onClick={store.deleteActiveProject}>Projekt löschen</button>
          </div>
        </aside>
      </div>
      {notice && <button className="toast" type="button" onClick={() => setNotice(null)}>{notice}</button>}
    </main>
  )
}
