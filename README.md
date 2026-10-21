# REALITY ENGINE

Web-App für einen gemeinsamen, messbaren digitalen Zwilling. SMART SCAN ist
**Dateiimport plus ehrliche Verfügbarkeit**. Object Capture, ARKit/LiDAR und
automatische Bounding-Box-Korrektur sind **nicht implementiert und nicht
getestet**.

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

## Alltagstauglichkeit

- Deutsche Ergebnistexte, Quelle und Unsicherheit an jedem Maß, Tablet- und
  Mobil-Layout mit Projektwahl und größeren Tippszielen.
- Parametrische Möbelbibliothek: Sofa, Sessel, Tisch, Schreibtisch, Stuhl,
  Schrank, Sideboard, Regal, Bett, Nachttisch. Keine fotorealistischen Surfaces.
- Leichte Türöffnung im gemeinsamen Modell (Schema v5): Rahmenstärke, Blatt,
  Öffnungswinkel, Anschlag, sichtbares Hindernis. FIT prüft Blatt, Schwenkfeld
  und Hindernis — kein voller CAD-Kreisbogen, keine Wegsuche.

## Simulatoren

- **FIT:** lineare Interpolation inkl. kürzester Hochachsendrehung, 2-cm-Stützstellen.
- **SUN:** Raum-Nord −Z plus Offset; Fenster als Lichtwege. Kein Wetter.
- **SPACE:** 1-cm-Raster, Kollisionen, Türblockierung.

## Grenzen

- Kein nativer Scan, keine Kamera, kein LiDAR, kein Object Capture.
- Keine automatische 3D-Wegsuche und keine Millimeter-Garantie.
- Türschwenk ist Rechteck plus Blatt-OBB, kein exakter Kreisring.
- Speicherung nur lokal.
