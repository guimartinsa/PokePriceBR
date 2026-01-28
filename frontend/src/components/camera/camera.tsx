import { useEffect, useRef } from "react";

export function CameraView() {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        async function startCamera() {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
                audio: false,
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        }

        startCamera();
    }, []);

    return (
        <div style={{ width: "100vw", height: "100vh", background: "#000" }}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                }}
            />
        </div>
    );
}
