import { useEffect, useMemo, useRef, useState } from "react";
import { ScanOverlay } from "./ScanOverlay";
import { CaptureButton } from "./CaptureButton";
import { uploadScan } from "../../api/scan";
import { useAuth } from "../../hooks/useAuth";
import { hasSubscriberPrivileges } from "../../utils/plan";
import "./camera.css";

type CardDetection = {
    id: string;
    name: string;
    number: string;
    priceLabel: string;
    source: "api" | "fallback";
};

const FREE_WEEKLY_SCAN_LIMIT = 30;
const FREE_SCAN_STORAGE_KEY = "scan:free-weekly-usage";
const TEMP_BATCH_COLLECTION_KEY = "scan:temp-batch-collection";
const SAVED_BATCH_COLLECTIONS_KEY = "scan:saved-batch-collections";

function getWeekId() {
    const now = new Date();
    const firstDay = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const diff = now.getTime() - firstDay.getTime();
    const week = Math.ceil((diff / 86400000 + firstDay.getUTCDay() + 1) / 7);
    return `${now.getUTCFullYear()}-W${week}`;
}

function readFreeUsage() {
    const raw = localStorage.getItem(FREE_SCAN_STORAGE_KEY);
    if (!raw) return { weekId: getWeekId(), count: 0 };

    try {
        const parsed = JSON.parse(raw) as { weekId: string; count: number };
        if (parsed.weekId !== getWeekId()) {
            return { weekId: getWeekId(), count: 0 };
        }
        return parsed;
    } catch {
        return { weekId: getWeekId(), count: 0 };
    }
}

function buildFallbackResult(): CardDetection {
    const fallbackCards = [
        { name: "Dedenne GX", number: "195/214", priceLabel: "R$ 55,50" },
        { name: "Pikachu V", number: "043/185", priceLabel: "R$ 19,90" },
        { name: "Charizard ex", number: "006/165", priceLabel: "R$ 189,00" },
    ];

    const selected = fallbackCards[Math.floor(Math.random() * fallbackCards.length)];

    return {
        id: crypto.randomUUID(),
        name: selected.name,
        number: selected.number,
        priceLabel: selected.priceLabel,
        source: "fallback",
    };
}

function parseApiResult(payload: unknown): CardDetection | null {
    if (!payload || typeof payload !== "object") return null;
    const record = payload as Record<string, unknown>;

    const name =
        typeof record.name === "string"
            ? record.name
            : typeof record.card_name === "string"
              ? record.card_name
              : null;

    const number =
        typeof record.number === "string"
            ? record.number
            : typeof record.card_number === "string"
              ? record.card_number
              : null;

    const price =
        typeof record.price === "number"
            ? `R$ ${record.price.toFixed(2).replace(".", ",")}`
            : typeof record.price === "string"
              ? record.price
              : "Preço indisponível";

    if (!name || !number) return null;

    return {
        id: crypto.randomUUID(),
        name,
        number,
        priceLabel: price,
        source: "api",
    };
}

export function CameraView() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const { user } = useAuth();

    const [error, setError] = useState<string | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [batchMode, setBatchMode] = useState(false);
    const [lastDetected, setLastDetected] = useState<CardDetection | null>(null);
    const [tempBatch, setTempBatch] = useState<CardDetection[]>(() => {
        const raw = localStorage.getItem(TEMP_BATCH_COLLECTION_KEY);
        if (!raw) return [];
        try {
            return JSON.parse(raw) as CardDetection[];
        } catch {
            return [];
        }
    });
    const [freeUsage, setFreeUsage] = useState(readFreeUsage);

    const isPremium = hasSubscriberPrivileges(user?.plan);
    const scansRemaining = FREE_WEEKLY_SCAN_LIMIT - freeUsage.count;

    useEffect(() => {
        localStorage.setItem(FREE_SCAN_STORAGE_KEY, JSON.stringify(freeUsage));
    }, [freeUsage]);

    useEffect(() => {
        localStorage.setItem(TEMP_BATCH_COLLECTION_KEY, JSON.stringify(tempBatch));
    }, [tempBatch]);

    useEffect(() => {
        async function startCamera() {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        facingMode: "environment",
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

        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach((track) => track.stop());
            }
        };
    }, []);

    const canCapture = useMemo(() => {
        if (isPremium) return true;
        return scansRemaining > 0;
    }, [isPremium, scansRemaining]);

    const handleCapture = async () => {
        if (!videoRef.current || capturing || !canCapture) return;

        setCapturing(true);

        try {
            const canvas = document.createElement("canvas");
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                throw new Error("Não foi possível criar contexto 2D");
            }

            ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (outputBlob) => {
                        if (outputBlob) resolve(outputBlob);
                        else reject(new Error("Erro ao criar blob"));
                    },
                    "image/jpeg",
                    0.9,
                );
            });

            let detection: CardDetection | null = null;
            try {
                const response = await uploadScan(blob);
                detection = parseApiResult(response);
            } catch {
                detection = null;
            }

            if (!detection) {
                await new Promise((resolve) => setTimeout(resolve, 450));
                detection = buildFallbackResult();
            }

            setLastDetected(detection);

            if (batchMode && isPremium) {
                setTempBatch((previous) => [detection, ...previous]);
            }

            if (!isPremium) {
                setFreeUsage((previous) => ({ ...previous, count: previous.count + 1 }));
            }
        } catch (captureError) {
            console.error("Erro no scan:", captureError);
            alert("Erro ao capturar a carta. Tente novamente.");
        } finally {
            setCapturing(false);
        }
    };

    const persistBatchCollection = () => {
        if (tempBatch.length === 0) {
            alert("Você ainda não adicionou cartas no lote temporário.");
            return;
        }

        const raw = localStorage.getItem(SAVED_BATCH_COLLECTIONS_KEY);
        const saved = raw ? (JSON.parse(raw) as CardDetection[][]) : [];
        saved.push(tempBatch);
        localStorage.setItem(SAVED_BATCH_COLLECTIONS_KEY, JSON.stringify(saved));

        setTempBatch([]);
        setBatchMode(false);
        alert("Coleção salva com sucesso na coleção permanente.");
    };

    if (error) {
        return (
            <div className="camera-error">
                <div className="error-content">
                    <h2>⚠️ Erro ao acessar câmera</h2>
                    <p>{error}</p>
                    <p className="error-hint">
                        Verifique se você deu permissão para usar a câmera nas configurações
                        do navegador.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline muted className="camera-video" />
            <ScanOverlay />

            <div className="scan-plan-pill">
                {isPremium ? (
                    <span>Plano Premium • scans ilimitados + lote</span>
                ) : (
                    <span>Plano Free • {scansRemaining} scans restantes nesta semana</span>
                )}
            </div>

            <CaptureButton onCapture={handleCapture} disabled={capturing || !canCapture} />

            {isPremium && (
                <button
                    type="button"
                    className={`batch-toggle ${batchMode ? "is-active" : ""}`}
                    onClick={() => setBatchMode((value) => !value)}
                    aria-label="Ativar scan por lote"
                >
                    🗂️
                </button>
            )}

            {lastDetected && (
                <section className="scan-result-card">
                    <p className="scan-result-label">Carta identificada</p>
                    <p className="scan-result-name">{lastDetected.name}</p>
                    <p className="scan-result-number">Nº {lastDetected.number}</p>
                    <p className="scan-result-price">{lastDetected.priceLabel}</p>
                    {lastDetected.source === "fallback" && (
                        <small className="scan-result-hint">
                            Simulação local: conecte a API para OCR real de nome e número.
                        </small>
                    )}
                </section>
            )}

            {isPremium && tempBatch.length > 0 && (
                <section className="temp-batch-panel">
                    <div>
                        <strong>Lote temporário</strong>
                        <p>{tempBatch.length} carta(s) aguardando confirmação.</p>
                    </div>
                    <button type="button" onClick={persistBatchCollection}>
                        Manter coleção
                    </button>
                </section>
            )}

            {capturing && <div className="capturing-indicator">Lendo nome e número...</div>}
        </div>
    );
}
