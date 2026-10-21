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

## Simulatoren (nachgehärtet)

- **FIT:** lineare Interpolation inkl. kürzestem Yaw, 2-cm-Stützstellen,
  Startzustand und Ergebniszustände (`clear`, `collision`, `clearance`,
  `outside-room`, `door-blocked`). Keine automatische 3D-Wegsuche.
- **SUN:** Raum-Nord ist −Z plus `northOffsetDeg`. Fenster/Öffnungen sind
  Lichtwege, wenn der Lichtvektor die Innen-Normale trifft. Kein Wetter.
- **SPACE:** OBB-Kollisionen, Türblockierung (3D-OBB oder 2D-Grundriss),
  freie Bodenfläche als Union geclippter Fußabdrücke auf einem 1-cm-Raster.

## Scan / Pose

RoomPlan-ähnliches JSON übernimmt Maße und, soweit die 4×4-Matrix lesbar ist,
Pose relativ zum Floor-Ursprung. Fehlende Unsicherheit bleibt die dokumentierte
Annahme 0,05 m. Kein nativer Scan.

## Bekannte Einschränkungen

- Kein Live-LiDAR, keine Kamera, kein Object Capture, keine Mesh-Bounding-Box.
- FIT interpoliert nur die Gerade (plus Yaw/Tilt); Umwege werden nicht gesucht.
- SPACE ist ein Raster, kein CAD-Boolean. 1 cm ist die Diskretisierung.
- SUN kennt keine Bewölkung, kein Gelände, keine Nachbarhäuser, keine Glasoptik.
- Pose ohne lesbare Transform wird übersprungen, nicht erfunden.
- Speicherung nur lokal (Projekt-Schema v4 inkl. `openings`).
