# REALITY ENGINE

Phase 1 einer modularen Web-App für einen gemeinsamen, messbaren digitalen
Zwilling von Räumen und Einrichtung. Die Oberfläche ist deutschsprachig und
umfasst die Arbeitsbereiche **FIT**, **SUN** und **SPACE**. **SMART SCAN** ist
bewusst als spätere Funktion gekennzeichnet.

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

## Phase-1-Funktionsumfang

- versioniertes Projektschema `reality-engine/project@1`
- kanonische Speicherung aller Längen in Metern
- Messquelle, Messunsicherheit und Änderungszeit je Maß
- mehrere lokal persistierte Projekte
- validierter JSON-Import und verlustfreier JSON-Export
- interaktiver Three.js-Raum mit parametrischen Möbeln
- editierbare Raum-, Möbel-, Positions- und Rotationswerte
- visuelle SUN-Lichtvorschau und deterministische SPACE-Kennzahlen
- responsive Anthrazit/Marine/Cyan-Oberfläche

## Architektur

```text
src/
├── core/        # Datenmodell, Einheiten, Mutationen, Import/Export
├── simulation/  # deterministische, UI-unabhängige Berechnungen
├── scan/        # Verträge für künftige Sensoradapter, keine Implementierung
└── web/         # React, Zustand, React Three Fiber und Oberfläche
```

Die Trennung ist absichtlich: Der digitale Zwilling kennt weder React noch
Three.js, und künftige Scan-Adapter liefern ausschließlich prüfbare
Messwertentwürfe an den Kern.

## Bekannte Einschränkungen

- Speicherung erfolgt in Phase 1 ausschließlich im lokalen Browser.
- SUN ist eine visuelle Uhrzeit-Vorschau ohne Standort, Datum oder
  physikalisch kalibrierte Beleuchtungsberechnung.
- SPACE summiert rechteckige Möbelgrundflächen; Überlappungen werden noch
  nicht geometrisch aufgelöst.
- Möbel lassen sich numerisch positionieren; direktes Verschieben im
  3D-Viewport ist noch nicht enthalten.
- SMART SCAN hat nur eine typisierte Adapter-Schnittstelle. Es wird kein
  Sensorzugriff vorgetäuscht.

## Nächste Schritte

1. Standort- und datumsbasierte Sonnenbahn mit validiertem Himmelsmodell.
2. Direkte Transformationsgriffe, Kollisionsprüfung und Laufwege.
3. Serverseitige Synchronisation mit Konfliktauflösung und Projektrechten.
4. Erster realer Scan-Adapter hinter der vorhandenen Schnittstelle,
   einschließlich Kalibrierung und Einwilligungsfluss.
