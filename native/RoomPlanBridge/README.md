# RoomPlan-Brücke (unimplementiert, ungetestet)

Dieses Verzeichnis ist ein **Schnittstellen-Skelett**. Es gibt:

- keinen lauffähigen Xcode-Target
- keine `RoomCaptureSession`
- keine Kamera-, LiDAR- oder ARKit-Nutzung
- keine getestete SwiftUI-Oberfläche

Die Web-App importiert **Dateien**: RoomPlan-ähnliches JSON oder `reality-engine/scan@1`.

Erwartete Dateistruktur (Untersatz):

```json
{
  "identifier": "…",
  "floors": [{ "dimensions": [breite, 0, tiefe] }],
  "walls": [{ "dimensions": [länge, höhe, dicke], "transform": [16 Zahlen, Spaltenmajor] }],
  "objects": [{ "category": "sofa", "dimensions": [breite, höhe, tiefe] }]
}
```

Kategorien, die auf das Zwilling-Modell abgebildet werden: sofa/couch, table, chair, storage/cabinet, bed. Andere Objekte werden übersprungen, nicht erfunden.

Transform/Pose wird **nicht** in den Zwilling geschrieben. Die Unsicherheit beträgt dokumentiert **0,05 m**, weil RoomPlan-JSON keine Messunsicherheit mitliefert.

Siehe auch `../FEASIBILITY.md` zu Object Capture, LiDAR und Bounding-Boxen.
