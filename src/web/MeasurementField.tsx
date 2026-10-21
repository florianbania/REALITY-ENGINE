import { useState } from 'react'
import { SOURCE_LABELS, type Measurement } from '../core/model'
import { fromMeters, toMeters } from '../core/units'

interface MeasurementFieldProps {
  label: string
  measurement: Measurement
  onCommit: (valueM: number, uncertaintyM: number) => void
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

function MeasurementDraft({ label, measurement, onCommit }: MeasurementFieldProps) {
  const [value, setValue] = useState(String(fromMeters(measurement.valueM, 'cm')))
  const [uncertainty, setUncertainty] = useState(
    String(fromMeters(measurement.uncertaintyM, 'cm')),
  )

  const commit = () => {
    const nextValue = Number(value)
    const nextUncertainty = Number(uncertainty)
    if (Number.isFinite(nextValue) && nextValue > 0 && nextUncertainty >= 0) {
      onCommit(toMeters(nextValue, 'cm'), toMeters(nextUncertainty, 'cm'))
    }
  }

  return (
    <div className="measurement-field">
      <div className="measurement-field__header">
        <label htmlFor={`${label}-value`}>{label}</label>
        <span title={`Aktualisiert: ${new Date(measurement.updatedAt).toLocaleString('de-DE')}`}>
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
        <div className="uncertainty-input" title="Messunsicherheit">
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
