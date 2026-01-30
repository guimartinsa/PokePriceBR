import { CameraView } from "../components/camera/CameraView";
import { ScanOverlay } from "../components/camera/ScanOverlay";

export default function ScanPage() {
    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            <CameraView />
            <ScanOverlay />
        </div>
    );
}
