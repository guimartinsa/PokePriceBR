import { useCamera } from "./useCamera";
import "./camera.css";

export function CameraView() {
    const { videoRef, error } = useCamera();

    if (error) {
        return <p className="camera-error">{error}</p>;
    }

    return (
        <div className="camera-container">
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
            />
        </div>
    );
}
