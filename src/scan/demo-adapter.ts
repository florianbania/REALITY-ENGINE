import type { DigitalTwinProject } from '../core/model'
import type { ScanAdapter, ScanDocument } from './contracts'
import { createDemoScanDocument } from './demo-fixture'

export class DemoSimulatedScanAdapter implements ScanAdapter {
  readonly info = createDemoScanDocument().adapter

  async isAvailable(): Promise<boolean> {
    return true
  }

  async collect(_project: DigitalTwinProject, signal: AbortSignal): Promise<ScanDocument> {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')
    return createDemoScanDocument()
  }
}
