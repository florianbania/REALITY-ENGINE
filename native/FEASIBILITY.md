# Machbarkeit: Object Capture, ARKit/LiDAR, Bounding-Box

**Status in diesem Repository: nicht implementiert, nicht getestet.**
Die folgenden Angaben fassen öffentlich dokumentierte Plattformvoraussetzungen
zusammen. Sie sind keine Messergebnisse dieses Projekts.

## RealityKit Object Capture

- Typischer Weg: viele Fotos um ein Objekt, danach `PhotogrammetrySession`
  (historisch macOS; Object Capture existiert laut Apple auch auf neueren
  iPhones/iPads).
- Hardware (unbestätigt hier): unterstützter Mac (Apple Silicon oder geeignete
  GPU) bzw. kompatibles iOS-Gerät; ausreichend Speicher und gleichmäßige
  Beleuchtung.
- Unsicherheiten: spiegelnde, transparente, sehr dünne oder texturlose
  Flächen; unvollständige Umläufe; bewegte Hintergründe. Daraus folgt **keine**
  belastbare Millimeterangabe.

## ARKit / LiDAR / RoomPlan

- RoomPlan und dichte Szenenrekonstruktion setzen laut Apple ein Gerät mit
  LiDAR voraus (iPhone Pro / iPad Pro, iOS 16+ für RoomPlan).
- Der Browser stellt RoomPlan, ARKit-Meshes und LiDAR-Tiefen **nicht** bereit.
- Unsicherheiten: verdeckte Möbelrückseiten, Glas, Hochglanz, dunkle Ecken,
  abgebrochene Scans. Ein unvollständiger Scan liefert keine vollständige Hülle.

## Bounding-Box-Korrektur

- Eine Achsen-Box aus einem Mesh ist nur so vollständig wie das Mesh.
- Verdeckte Seiten verkleinern die Box systematisch. Spiegelungen erzeugen
  Löcher oder Artefakte. Das ist keine kalibrierte Messtoleranz.
- In der Web-App existiert nur die **manuelle** Maßkorrektur nach Dateiimport.
  Eine automatische Box-Anpassung aus Object Capture ist nicht gebaut.

## Was die Web-App tatsächlich kann

Dateiimport (`reality-engine/scan@1` oder RoomPlan-ähnliches JSON), Demo-Fixture,
Geometrieprüfung, manuelle Korrektur. Keine Kamerasession, kein LiDAR, keine
Photogrammetrie.
