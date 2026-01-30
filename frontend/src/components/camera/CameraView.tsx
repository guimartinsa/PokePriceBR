import { useCamera } from "./useCamera";
import "./camera.css";

type Props = {
    videoRef: React.RefObject<HTMLVideoElement>;
};

export function CameraView({ videoRef }: Props) {
    const { error } = useCamera(videoRef);

    if (error) return <p>{error}</p>;

    return (
        <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-video"
        />
    );
}

