# REALITY ENGINE

Phase 2 einer modularen Web-App für einen gemeinsamen, messbaren digitalen
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

## Phase-2-Funktionsumfang

- versioniertes Projektschema `reality-engine/project@2` mit Migration von `@1`
- kanonische Speicherung aller Längen in Metern
- Messquelle, Messunsicherheit und Änderungszeit je Maß
- Türen als konservative Freizonen, Sonnenstand-Einstellungen und 3D-Orientierung
- mehrere lokal persistierte Projekte, validierter JSON-Import und -Export
- interaktiver Three.js-Raum mit parametrischen Möbeln und Transformationsgriffen
- **FIT:** manuelles Bewegen, Drehen und Kippen; OBB-SAT entlang eines
  geradlinig interpolierten Transportpfads; Mindestabstände; ehrliche
  Ergebniszustände (`clear`, `collision`, `clearance`, `outside-room`,
  `door-blocked`). Keine automatische Wegsuche.
- **SUN:** SunCalc mit Standort, Datum/Uhrzeit, IANA-Zeitzone inklusive DST,
  Nordausrichtung, Azimut/Höhe, geometrische Modellschatten und Tagesanimation
- **SPACE:** Grundriss und 3D-Planer (Platzieren, Verschieben, Drehen,
  Duplizieren, Löschen, Zweipunkt-Messen), Türblockierung, Kollisionen und
  freie Bodenfläche als Raster-Union projizierter OBB-Flächen
- responsive Anthrazit/Marine/Cyan-Oberfläche

## Architektur

```text
src/
├── core/        # Datenmodell, Einheiten, Mutationen, Import/Export
├── simulation/  # deterministische Kollision, Sonne und Flächen
├── scan/        # Verträge für künftige Sensoradapter, keine Implementierung
└── web/         # React, Zustand, React Three Fiber und Oberfläche
```

Die Trennung ist absichtlich: Der digitale Zwilling kennt weder React noch
Three.js, und künftige Scan-Adapter liefern ausschließlich prüfbare
Messwertentwürfe an den Kern.

## Bekannte Einschränkungen

- Speicherung erfolgt ausschließlich im lokalen Browser.
- FIT interpoliert nur geradlinig zwischen Start- und Zielpose. Es gibt keine
  Wegsuche und keine Aussage vor der expliziten Prüfung.
- Türzonen sind Rechtecke, keine Schwenkbögen.
- SUN nutzt die astronomische Sonnenposition von SunCalc. Wetter, Gelände,
  Nachbargebäude, Fensteroptik und diffuse Himmelsstrahlung sind nicht
  enthalten. Schatten sind geometrische Three.js-Schatten des Modells.
- SPACE-freie Fläche ist eine Rasterintegration (Standard 5 cm), keine
  analytisch exakte Polygon-Boolean-Operation.
- SMART SCAN hat nur eine typisierte Adapter-Schnittstelle. Es wird kein
  Sensorzugriff vorgetäuscht.

## Nächste Schritte

1. Serverseitige Synchronisation mit Konfliktauflösung und Projektrechten.
2. Erster realer Scan-Adapter hinter der vorhandenen Schnittstelle,
   einschließlich Kalibrierung und Einwilligungsfluss.
