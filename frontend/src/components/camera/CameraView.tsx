//import { useCamera } from "./useCamera";
import "./camera.css";

import { useEffect, type RefObject } from "react";

type Props = {
    videoRef: RefObject<HTMLVideoElement | null>;
};

export function CameraView({ videoRef }: Props) {
    useEffect(() => {
        let stream: MediaStream;

        async function startCamera() {
            stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        }

        startCamera();

        return () => {
            stream?.getTracks().forEach((track) => track.stop());
        };
    }, [videoRef]);

    return (
        <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                }}
            />
        </div>
    );
}
