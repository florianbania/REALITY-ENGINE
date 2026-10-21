# REALITY ENGINE

Phase 5 einer modularen Web-App für einen gemeinsamen, messbaren digitalen
Zwilling. SMART SCAN ist **Dateiimport plus ehrliche Verfügbarkeit**. Object
Capture, ARKit/LiDAR und automatische Bounding-Box-Korrektur sind **nicht
implementiert und nicht getestet**.

## Start

Voraussetzung: Node.js 22 oder neuer.

```bash
npm install
npm run dev
```

Qualität (lokal und in GitHub Actions):

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## Was Phase 5 zusätzlich leistet

- sichtbare Geräte-/Scan-Verfügbarkeit (Datei und Demo ja; native Capture nein)
- CI für Lint, Typecheck, Tests und Build
- Machbarkeitsnotiz unter `native/FEASIBILITY.md` ohne fingierte Scan-UI

## Bekannte Einschränkungen

- Kein Live-LiDAR, keine Kamera, kein Object Capture, keine Mesh-Bounding-Box.
- Verdeckte, spiegelnde oder unvollständige Aufnahmen sind in keiner Zahl
  „wegkalibriert“. Es gibt keine Millimeter-Garantie.
- RoomPlan-JSON: Unsicherheit 0,05 m als Annahme; Pose wird nicht übernommen.
- FIT ohne Wegsuche; Türzonen Rechtecke; SUN ohne Wetter; SPACE 5-cm-Raster;
  Speicherung nur lokal.
