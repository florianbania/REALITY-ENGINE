import { useState } from 'react'
import { SOURCE_LABELS, type Measurement } from '../core/model'
import { clampPrecision, fromMeters, toMeters } from '../core/units'

interface MeasurementFieldProps {
  label: string
  measurement: Measurement
  onCommit: (valueM: number, uncertaintyM: number) => void
  allowZero?: boolean
}

export function MeasurementField(props: MeasurementFieldProps) {
  const { measurement } = props
  return (
    <MeasurementDraft
      key={`${measurement.updatedAt}-${measurement.valueM}-${measurement.uncertaintyM}`}
      {...props}
    />
  )
}

function MeasurementDraft({ label, measurement, onCommit, allowZero }: MeasurementFieldProps) {
  const [value, setValue] = useState(String(clampPrecision(fromMeters(measurement.valueM, 'cm'), 4)))
  const [uncertainty, setUncertainty] = useState(
    String(clampPrecision(fromMeters(measurement.uncertaintyM, 'cm'), 4)),
  )

  const commit = () => {
    const nextValue = Number(value)
    const nextUncertainty = Number(uncertainty)
    const min = allowZero ? 0 : 0.0001
    if (Number.isFinite(nextValue) && nextValue >= min && nextUncertainty >= 0) {
      onCommit(toMeters(nextValue, 'cm'), toMeters(nextUncertainty, 'cm'))
    }
  }

  return (
    <div className="measurement-field">
      <div className="measurement-field__header">
        <label htmlFor={`${label}-value`}>{label}</label>
        <span
          className={`source-chip source-chip--${measurement.source}`}
          title={`Quelle ${SOURCE_LABELS[measurement.source]} · aktualisiert ${new Date(measurement.updatedAt).toLocaleString('de-DE')}`}
        >
          {SOURCE_LABELS[measurement.source]}
        </span>
      </div>
      <div className="measurement-field__inputs">
        <div className="unit-input">
          <input
            id={`${label}-value`}
            type="number"
            min="0.1"
            step="0.1"
            value={value}
            onChange={(event) => setValue(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            aria-label={`${label} in Zentimetern`}
          />
          <span>cm</span>
        </div>
        <div className="uncertainty-input" title="Angegebene Messunsicherheit, keine Kalibrierung">
          <span>±</span>
          <input
            type="number"
            min="0"
            step="0.1"
            value={uncertainty}
            onChange={(event) => setUncertainty(event.target.value)}
            onBlur={commit}
            onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
            aria-label={`Unsicherheit ${label} in Zentimetern`}
          />
          <span>cm</span>
        </div>
      </div>
    </div>
  )
}
