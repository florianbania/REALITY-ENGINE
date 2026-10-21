import Foundation

/// UNIMPLEMENTED / UNTESTED
/// Native RoomPlan capture is intentionally not provided. This module must not
/// be treated as a working iPhone LiDAR or camera integration.
public enum RoomPlanBridgeError: Error {
    case notImplemented(String)
}

public enum RoomPlanBridge {
    /// Would start `RoomCaptureSession` on a supported device. Not implemented.
    public static func captureRoom() throws -> Data {
        throw RoomPlanBridgeError.notImplemented(
            "Kein getesteter nativer iPhone-Scan. Exportiere CapturedRoom-JSON und importiere die Datei in der Web-App."
        )
    }

    /// Would encode a captured room. Not implemented.
    public static func exportJSON(from _: Any) throws -> Data {
        throw RoomPlanBridgeError.notImplemented(
            "JSON-Export aus RoomPlan ist in diesem Repository nicht implementiert und nicht getestet."
        )
    }
}
