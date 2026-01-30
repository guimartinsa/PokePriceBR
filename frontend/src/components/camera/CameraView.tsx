import { useEffect, useRef, useState } from "react";
import { ScanOverlay } from "./ScanOverlay";
import { CaptureButton } from "./CaptureButton";
import "./camera.css";

export function CameraView() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const streamRef = useRef<MediaStream | null>(null);

    useEffect(() => {
        async function startCamera() {
            try {
                const mediaStream = await navigator.mediaDevices.getUserMedia({
                    video: { 
                        facingMode: "environment",
                        width: { ideal: 1920 },
                        height: { ideal: 1080 }
                    },
                    audio: false,
                });

                streamRef.current = mediaStream;

                if (videoRef.current) {
                    videoRef.current.srcObject = mediaStream;
                }
            } catch (err) {
                console.error("Erro ao acessar câmera:", err);
                setError("Não foi possível acessar a câmera");
            }
        }

        startCamera();

        // Cleanup ao desmontar
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const handleCapture = () => {
        if (!videoRef.current) return;

        const canvas = document.createElement("canvas");
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        const ctx = canvas.getContext("2d");
        if (ctx) {
            ctx.drawImage(videoRef.current, 0, 0);
            
            canvas.toBlob((blob) => {
                if (blob) {
                    console.log("Imagem capturada:", blob);
                    // TODO: Enviar para API de scan
                    alert("Foto capturada! (implementar envio para API)");
                }
            }, "image/jpeg", 0.9);
        }
    };

    if (error) {
        return (
            <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100vh",
                background: "#000",
                color: "#fff",
                padding: "20px",
                textAlign: "center",
                flexDirection: "column"
            }}>
                <h2>⚠️ Erro ao acessar câmera</h2>
                <p style={{ marginTop: "10px" }}>{error}</p>
                <p style={{ fontSize: "14px", marginTop: "20px", color: "#999" }}>
                    Verifique se você deu permissão para usar a câmera
                </p>
            </div>
        );
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
            
            <ScanOverlay />
            <CaptureButton onCapture={handleCapture} />
        </div>
    );
}