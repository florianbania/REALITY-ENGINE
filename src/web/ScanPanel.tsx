import { CircleAlert, FileJson, ScanLine } from 'lucide-react'
import { useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import type { DigitalTwinProject } from '../core/model'
import { SOURCE_LABELS } from '../core/model'
import { formatLength } from '../core/units'
import type { ScanApplyResult, ScanDocument } from '../scan/contracts'
import { reportScanAvailability, STATUS_LABELS } from '../scan/availability'
import { DemoSimulatedScanAdapter } from '../scan/demo-adapter'
import { parseIncomingScan, ScanFormatError } from '../scan/document'

interface ScanPanelProps {
  project: DigitalTwinProject
  onApply: (document: ScanDocument) => ScanApplyResult
}

const adapter = new DemoSimulatedScanAdapter()

export function ScanPanel({ project, onApply }: ScanPanelProps) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<ScanDocument | null>(null)
  const [result, setResult] = useState<ScanApplyResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const availability = reportScanAvailability()

  const loadDemo = async () => {
    setError(null)
    setResult(null)
    const document = await adapter.collect(project, new AbortController().signal)
    setPending(document)
  }

  const loadFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    try {
      setError(null)
      setResult(null)
      setPending(parseIncomingScan(await file.text()))
    } catch (caught) {
      setPending(null)
      setError(
        caught instanceof ScanFormatError
          ? caught.issues[0]
          : 'Die Scan-Datei konnte nicht gelesen werden.',
      )
    } finally {
      event.target.value = ''
    }
  }

  const apply = () => {
    if (!pending) return
    const next = onApply(pending)
    setResult(next)
    if (next.applied > 0) setPending(null)
  }

  const sources = [
    ...(['width', 'depth', 'height'] as const).map((key) => ({
      label: `Raum ${{ width: 'Breite', depth: 'Tiefe', height: 'Höhe' }[key]}`,
      measurement: project.room.dimensions[key],
    })),
    ...project.furniture.flatMap((item) =>
      (['width', 'depth', 'height'] as const).map((key) => ({
        label: `${item.name} ${{ width: 'B', depth: 'T', height: 'H' }[key]}`,
        measurement: item.dimensions[key],
      })),
    ),
  ]

  return (
    <div className="scan-panel">
      <div className="scan-banner">
        <ScanLine size={16} />
        <div>
          <strong>SMART SCAN · Dateiimport</strong>
          <span>Kein Kamerazugriff, kein getesteter iPhone-LiDAR, keine vorgetäuschte Messung.</span>
        </div>
      </div>
      <p className="panel-copy">
        Unterstützt reality-engine/scan@1 und RoomPlan-ähnliches JSON. Object
        Capture, ARKit/LiDAR und automatische Bounding-Boxen sind Machbarkeit —
        nicht implementiert, nicht getestet, keine Präzisionsangabe.
      </p>
      <h3>Geräte- und Scan-Verfügbarkeit</h3>
      <div className="availability-list">
        {availability.items.map((item) => (
          <div key={item.id} className={`availability-item availability-item--${item.status}`}>
            <strong>{item.label}</strong>
            <em>{STATUS_LABELS[item.status]}</em>
            <span>{item.detail}</span>
          </div>
        ))}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept=".json,.scan.json,application/json"
        hidden
        onChange={loadFile}
      />
      <button className="primary-action" type="button" onClick={loadDemo}>
        Demo-Simulation laden
      </button>
      <button className="secondary-action" type="button" onClick={() => fileInput.current?.click()}>
        <FileJson size={15} /> Scan- oder RoomPlan-JSON importieren
      </button>
      {error && <div className="sun-error">{error}</div>}
      {pending && (
        <div className="scan-pending">
          {pending.demo && <span className="badge badge--muted">{pending.demoLabel ?? 'DEMO'}</span>}
          <strong>{pending.adapter.name}</strong>
          <span>{pending.drafts.length} Messentwürfe · {pending.origin}</span>
          <ul>
            {pending.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
          <button className="primary-action" type="button" onClick={apply}>
            Geometrie prüfen und anwenden
          </button>
        </div>
      )}
      {result && (
        <div className={`fit-result ${result.applied > 0 ? 'fit-result--clear' : 'fit-result--issue'}`}>
          {result.applied > 0 ? <ScanLine size={18} /> : <CircleAlert size={18} />}
          <div>
            <strong>
              {result.applied > 0
                ? `${result.applied} Maße übernommen`
                : 'Keine Maße übernommen'}
            </strong>
            <span>
              {result.unmatched.length} unzugeordnet · {result.issues.length} Hinweise.
              Quellen der übernommenen Werte: Scan.
            </span>
          </div>
        </div>
      )}
      {result?.issues.map((issue) => (
        <div key={`${issue.path}-${issue.message}`} className="scan-issue">
          <span>{issue.severity === 'error' ? 'Fehler' : 'Hinweis'}</span>
          {issue.message}
        </div>
      ))}
      {project.lastScan && (
        <div className="door-summary">
          <strong>
            Letzter Import {project.lastScan.demo ? 'DEMO' : 'Datei'} ·{' '}
            {project.lastScan.adapterId}
          </strong>
          <span>
            {new Date(project.lastScan.importedAt).toLocaleString('de-DE')} ·{' '}
            {project.lastScan.draftCount} Entwürfe
          </span>
        </div>
      )}
      <h3>Messquellen</h3>
      <div className="source-list">
        {sources.map((row) => (
          <div key={row.label}>
            <span>{row.label}</span>
            <strong>{formatLength(row.measurement.valueM)}</strong>
            <em>{SOURCE_LABELS[row.measurement.source]}</em>
          </div>
        ))}
      </div>
      <p className="limitation">
        Korrekturen erfolgen über die Raum- und Möbelfelder. Eine manuelle Änderung setzt
        die Quelle auf „Manuell“ und überschreibt den Scanwert nicht heimlich.
      </p>
    </div>
  )
}
