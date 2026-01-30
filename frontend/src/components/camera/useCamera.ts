import { useEffect, useRef, useState } from "react";

export function useCamera() {
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: { ideal: "environment" }, // câmera traseira
                    },
                    audio: false,
                });

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                setError("Não foi possível acessar a câmera");
            }
        }

        startCamera();

        return () => {
            streamRef.current?.getTracks().forEach((t) => t.stop());
        };
    }, []);

    return { videoRef, error };
}
