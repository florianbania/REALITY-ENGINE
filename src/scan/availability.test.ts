import { describe, expect, it } from 'vitest'
import { reportScanAvailability, STATUS_LABELS } from './availability'

describe('Scan-Verfügbarkeit', () => {
  it('meldet Dateiimport und Demo als verfügbar, native Capture als unimplementiert', () => {
    const report = reportScanAvailability({
      fileApi: true,
      nativeRoomPlan: false,
      nativeObjectCapture: false,
      nativeArKitLidar: false,
    })
    expect(report.environment).toBe('web-browser')
    expect(report.items.find((item) => item.id === 'file-import')?.status).toBe('available')
    expect(report.items.find((item) => item.id === 'demo-fixture')?.status).toBe('available')
    expect(report.items.find((item) => item.id === 'roomplan-native')?.status).toBe(
      'unimplemented',
    )
    expect(report.items.find((item) => item.id === 'object-capture')?.status).toBe(
      'unimplemented',
    )
    expect(report.items.find((item) => item.id === 'bbox-from-mesh')?.status).toBe(
      'unimplemented',
    )
    expect(STATUS_LABELS.unimplemented).toMatch(/ungetestet/)
  })

  it('meldet fehlende Datei-API ehrlich als nicht verfügbar', () => {
    const report = reportScanAvailability({
      fileApi: false,
      nativeRoomPlan: false,
      nativeObjectCapture: false,
      nativeArKitLidar: false,
    })
    expect(report.items.find((item) => item.id === 'file-import')?.status).toBe('unavailable')
  })

  it('behauptet auch bei gesetztem Native-Probe keine getestete Genauigkeit', () => {
    const report = reportScanAvailability({
      fileApi: true,
      nativeRoomPlan: true,
      nativeObjectCapture: true,
      nativeArKitLidar: true,
    })
    expect(report.items.find((item) => item.id === 'object-capture')?.status).toBe(
      'unimplemented',
    )
    expect(report.items.find((item) => item.id === 'bbox-from-mesh')?.status).toBe(
      'unimplemented',
    )
  })
})
