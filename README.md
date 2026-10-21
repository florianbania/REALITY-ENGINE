# REALITY ENGINE

Phase 4 einer modularen Web-App für einen gemeinsamen, messbaren digitalen
Zwilling. **FIT**, **SUN**, **SPACE** und **SMART SCAN** (Dateiimport). Es gibt
**keinen** getesteten nativen iPhone-Scan.

## Start

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

Qualitätsprüfung:

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Phase-4-Schritt

- dateibasierter Import von `reality-engine/scan@1` **und** RoomPlan-ähnlichem JSON
- Validierung, Messquelle `scan`, dokumentierte Unsicherheit 0,05 m bei RoomPlan-Dateien
- manuelle Messwertkorrektur (Quelle wird `manual`)
- Demo-Simulation aus Phase 3 bleibt als gekennzeichnetes Fixture
- natives Skelett unter `native/RoomPlanBridge/` — ausdrücklich unimplementiert und ungetestet

## Architektur

```text
src/
├── core/        # Datenmodell, Einheiten, Mutationen, Import/Export
├── simulation/  # Kollision, Sonne, Flächen
├── scan/        # Scan-Dokumente, RoomPlan-Dateiimport, Demo-Adapter
└── web/         # React-Oberfläche
native/RoomPlanBridge/   # unimplementierte iOS-Schnittstelle
```

## Bekannte Einschränkungen

- Kein Live-LiDAR, keine Kamera, kein getesteter RoomPlan-Capture.
- RoomPlan-Transform/Pose wird nicht in den Zwilling geschrieben.
- Unsicherheit im RoomPlan-Import ist eine Annahme, keine Sensorstreuung.
- Unbekannte Objektkategorien werden übersprungen, nicht erfunden.
- FIT ohne Wegsuche; Türzonen Rechtecke; SUN ohne Wetter; SPACE 5-cm-Raster;
  Speicherung nur lokal.
