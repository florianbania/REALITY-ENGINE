import { ArrowUpRight, Boxes, Ruler, ScanLine, Sun } from 'lucide-react'
import type { ReactNode } from 'react'
import type { WorkspaceMode } from './store'

interface LandingProps {
  onEnter: (mode: WorkspaceMode) => void
  onOpenProjects: () => void
  projectCount: number
}

interface ModuleCardProps {
  code: string
  title: string
  description: string
  detail: string
  icon: ReactNode
  onClick?: () => void
  disabled?: boolean
  badge?: string
}

function ModuleCard({
  code,
  title,
  description,
  detail,
  icon,
  onClick,
  disabled,
  badge,
}: ModuleCardProps) {
  return (
    <button
      type="button"
      className={`module-card ${disabled ? 'module-card--disabled' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      <span className="module-card__number">{code}</span>
      <span className="module-card__icon">{icon}</span>
      {(disabled || badge) && (
        <span className="badge badge--muted">{badge ?? 'Später'}</span>
      )}
      <span className="module-card__content">
        <strong>{title}</strong>
        <span>{description}</span>
      </span>
      <span className="module-card__footer">
        <span>{detail}</span>
        {!disabled && <ArrowUpRight size={18} aria-hidden="true" />}
      </span>
    </button>
  )
}

export function Landing({ onEnter, onOpenProjects, projectCount }: LandingProps) {
  return (
    <main className="landing">
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <nav className="landing-nav">
        <a className="wordmark" href="/" aria-label="REALITY ENGINE Startseite">
          <span className="wordmark__mark">RE</span>
          <span>
            REALITY
            <small>ENGINE</small>
          </span>
        </a>
        <button className="nav-projects" type="button" onClick={onOpenProjects}>
          Projekte
          <span>{projectCount.toString().padStart(2, '0')}</span>
        </button>
      </nav>

      <section className="hero">
        <div className="eyebrow">
          <span />
          Digitaler Zwilling · Phase 05
        </div>
        <h1>
          Räume verstehen.
          <br />
          <em>Realität gestalten.</em>
        </h1>
        <p>
          Eine gemeinsame, messbare Grundlage für Einrichtung, Licht und
          Flächennutzung – präzise in Metern, transparent in ihrer Herkunft.
        </p>
        <div className="hero__meta">
          <span>Versioniertes Datenmodell</span>
          <span>Interaktiver 3D-Raum</span>
          <span>Lokale Projektdaten</span>
        </div>
      </section>

      <section className="module-grid" aria-label="Werkzeuge">
        <ModuleCard
          code="01"
          title="FIT"
          description="Passt es wirklich?"
          detail="Maße & Möbel"
          icon={<Ruler size={28} />}
          onClick={() => onEnter('fit')}
        />
        <ModuleCard
          code="02"
          title="SUN"
          description="Licht im Raum erleben."
          detail="SunCalc & Schatten"
          icon={<Sun size={28} />}
          onClick={() => onEnter('sun')}
        />
        <ModuleCard
          code="03"
          title="SPACE"
          description="Fläche bewusst nutzen."
          detail="Grundriss & 3D-Planer"
          icon={<Boxes size={28} />}
          onClick={() => onEnter('space')}
        />
        <ModuleCard
          code="04"
          title="SMART SCAN"
          description="RoomPlan-JSON dateibasiert übernehmen."
          detail="Dateiimport · Verfügbarkeit"
          icon={<ScanLine size={28} />}
          badge="Datei"
          onClick={() => onEnter('scan')}
        />
      </section>

      <footer className="landing-footer">
        <span>REALITY ENGINE / 0.1.0</span>
        <span>Alle Maße im SI-System</span>
      </footer>
    </main>
  )
}
