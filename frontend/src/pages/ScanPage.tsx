import { useRef } from "react";
import { CameraView } from "../components/camera/CameraView";
import { ScanOverlay } from "../components/camera/ScanOverlay";
import { CaptureButton } from "../components/camera/CaptureButton";
import { captureFrame } from "../components/camera/captureFrame";
import { uploadScan } from "../api/scan";

export default function ScanPage() {
    const videoRef = useRef<HTMLVideoElement | null>(null);

    async function handleCapture() {
        if (!videoRef.current) return;

        try {
            const blob = await captureFrame(videoRef.current);
            await uploadScan(blob);
            alert("Imagem enviada com sucesso!");
        } catch (error) {
            console.error("Erro ao capturar/enviar imagem:", error);
            alert("Erro ao enviar imagem. Tente novamente.");
        }
    }

    return (
        <div style={{ position: "relative", width: "100%", height: "100vh" }}>
            <CameraView videoRef={videoRef} />
            <ScanOverlay />
            <CaptureButton onCapture={handleCapture} />
        </div>
    );
}