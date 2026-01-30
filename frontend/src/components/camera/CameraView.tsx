import { useEffect, useRef, useState } from "react";
import { ScanOverlay } from "./ScanOverlay";
import { CaptureButton } from "./CaptureButton";
import { uploadScan } from "../../api/scan";
import "./camera.css";

export function CameraView() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [capturing, setCapturing] = useState(false);

    // ==================
    // INICIAR CÂMERA
    // ==================
    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment", // Câmera traseira
                        width: { ideal: 1920 },
                        height: { ideal: 1080 },
                    },
                    audio: false,
                });

                streamRef.current = stream;

                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Erro ao acessar câmera:", err);
                setError("Não foi possível acessar a câmera. Verifique as permissões.");
            }
        }

        startCamera();

        // CLEANUP: Desligar câmera ao desmontar componente
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => {
                    track.stop();
                });
            }
        };
    }, []);

    // ==================
    // CAPTURAR IMAGEM
    // ==================
    const handleCapture = async () => {
        if (!videoRef.current || capturing) return;

        setCapturing(true);

        try {
            // 1. Criar canvas
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            // 2. Desenhar frame atual do vídeo no canvas
            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Não foi possível criar contexto 2D");
            }

            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            // 3. Converter canvas para Blob
            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (blob) => {
                        if (blob) {
                            resolve(blob);
                        } else {
                            reject(new Error("Erro ao criar blob"));
                        }
                    },
                    "image/jpeg",
                    0.9 // Qualidade 90%
                );
            });

            // 4. Enviar para API
            console.log("📸 Imagem capturada:", blob);
            
            // TODO: Descomentar quando API estiver pronta
            // const result = await uploadScan(blob);
            // console.log("✅ Resposta da API:", result);
            
            alert("✅ Foto capturada com sucesso!\n(Integração com API pendente)");

        } catch (error) {
            console.error("❌ Erro ao capturar/enviar:", error);
            alert("Erro ao capturar imagem. Tente novamente.");
        } finally {
            setCapturing(false);
        }
    };

    // ==================
    // RENDER - ERRO
    // ==================
    if (error) {
        return (
            <div className="camera-error">
                <div className="error-content">
                    <h2>⚠️ Erro ao acessar câmera</h2>
                    <p>{error}</p>
                    <p className="error-hint">
                        Verifique se você deu permissão para usar a câmera nas
                        configurações do navegador.
                    </p>
                </div>
            </div>
        );
    }

    // ==================
    // RENDER - CÂMERA
    // ==================
    return (
        <div className="camera-container">
            {/* Vídeo da câmera */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="camera-video"
            />

            {/* Overlay com frame de captura */}
            <ScanOverlay />

            {/* Botão de captura */}
            <CaptureButton 
                onCapture={handleCapture} 
                disabled={capturing}
            />

            {/* Indicador de captura */}
            {capturing && (
                <div className="capturing-indicator">
                    Processando...
                </div>
            )}
        </div>
    );
}