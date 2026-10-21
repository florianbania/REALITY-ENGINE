# REALITY ENGINE

Phase 3 einer modularen Web-App für einen gemeinsamen, messbaren digitalen
Zwilling von Räumen und Einrichtung. Die Oberfläche ist deutschsprachig und
umfasst **FIT**, **SUN**, **SPACE** und **SMART SCAN** (Demo-Import).

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

## Phase-3-Funktionsumfang

- Projektschema `reality-engine/project@3` mit Migration von `@1` und `@2`
- einheitliche Scan-Datenschnittstelle `reality-engine/scan@1`
- JSON-Import von Scan-Dokumenten und gekennzeichnete Demo-Simulation
- geometrische Validierung vor der Übernahme (Raumhülle, Möbelmaße, OBB)
- Messquellen `manual` / `import` / `scan` und manuelle Messwertkorrektur
- FIT, SUN und SPACE aus Phase 2 bleiben erhalten

## Architektur

```text
src/
├── core/        # Datenmodell, Einheiten, Mutationen, Import/Export
├── simulation/  # deterministische Kollision, Sonne und Flächen
├── scan/        # Scan-Dokumente, Demo-Adapter, Geometrieprüfung
└── web/         # React, Zustand, React Three Fiber und Oberfläche
```

Scan-Adapter liefern ausschließlich prüfbare Messwertentwürfe. Der Demo-Adapter
liest ein Fixture und gibt das ausdrücklich als Simulation aus.

## Bekannte Einschränkungen

- Es gibt keinen echten iPhone-, LiDAR- oder Kamerascan.
- Die Demo-Unsicherheiten sind plausible Annahmen, keine kalibrierte Sensorik.
- Unzugeordnete Möbelentwürfe werden nicht stillschweigend als neue Objekte
  angelegt.
- FIT ohne Wegsuche; Türzonen als Rechtecke; SUN ohne Wetter/Gelände;
  SPACE-Fläche als 5-cm-Raster; Speicherung nur lokal.
