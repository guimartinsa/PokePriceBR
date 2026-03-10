import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { ScanOverlay } from "./ScanOverlay";
import { CaptureButton } from "./CaptureButton";
import { ScanApiError, submitScanCard } from "../../api/scan";
import { useAuth } from "../../hooks/useAuth";
import { hasSubscriberPrivileges } from "../../utils/plan";
import {
    createOcrDebugPreview,
    extractCardDataFromImage,
    OcrProcessingError,
} from "../../services/ocrService";
import "./camera.css";

type CardDetection = {
    id: string;
    name: string;
    number: string;
    priceLabel: string;
    source: "api";
};

const FREE_WEEKLY_SCAN_LIMIT = 30;
const FREE_SCAN_STORAGE_KEY = "scan:free-weekly-usage";
const TEMP_BATCH_COLLECTION_KEY = "scan:temp-batch-collection";
const SAVED_BATCH_COLLECTIONS_KEY = "scan:saved-batch-collections";

function buildScanErrorMessage(error: unknown): string {
    if (error instanceof OcrProcessingError) {
        return error.message;
    }

    if (error instanceof ScanApiError) {
        if (error.status === 503) {
            return "Servico de leitura indisponivel no momento. Tente novamente em instantes.";
        }

        if (error.message.trim().length > 0) {
            return error.message;
        }
    }

    return "Nao foi possivel identificar a carta. Tente novamente com melhor foco e iluminacao.";
}

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

function parseApiResult(
    payload: unknown,
    fallback: Pick<CardDetection, "name" | "number">,
): CardDetection {
    const record =
        payload && typeof payload === "object" ? (payload as Record<string, unknown>) : null;

    const nestedCard =
        record && typeof record.card === "object" && record.card !== null
            ? (record.card as Record<string, unknown>)
            : null;

    const toStringValue = (value: unknown): string | null => {
        if (typeof value === "string") {
            const trimmed = value.trim();
            return trimmed.length > 0 ? trimmed : null;
        }

        if (typeof value === "number" && Number.isFinite(value)) {
            return String(value);
        }

        return null;
    };

    const name =
        (record ? toStringValue(record.name) : null) ??
        (record ? toStringValue(record.card_name) : null) ??
        toStringValue(nestedCard?.name) ??
        toStringValue(nestedCard?.card_name) ??
        fallback.name;

    const number =
        (record ? toStringValue(record.number) : null) ??
        (record ? toStringValue(record.card_number) : null) ??
        (record ? toStringValue(record.localId) : null) ??
        toStringValue(nestedCard?.number) ??
        toStringValue(nestedCard?.card_number) ??
        toStringValue(nestedCard?.localId) ??
        fallback.number;

    const price =
        record && typeof record.price === "number"
            ? `R$ ${record.price.toFixed(2).replace(".", ",")}`
            : record && typeof record.price === "string"
                ? record.price
                : "Preco indisponivel";

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
    const uploadInputRef = useRef<HTMLInputElement>(null);
    const { user } = useAuth();

    const [error, setError] = useState<string | null>(null);
    const [capturing, setCapturing] = useState(false);
    const [batchMode, setBatchMode] = useState(false);
    const [lastDetected, setLastDetected] = useState<CardDetection | null>(null);
    const [scanError, setScanError] = useState<string | null>(null);
    const [ocrDebugPreview, setOcrDebugPreview] = useState<string | null>(null);
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
    const isAdmin = user?.is_admin === true || user?.plan === "ADMIN";
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
            } catch (cameraError) {
                console.error("Erro ao acessar camera:", cameraError);
                setError("Nao foi possivel acessar a camera. Verifique as permissoes.");
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

    const handleAdminUploadClick = () => {
        uploadInputRef.current?.click();
    };

    const handleAdminUploadChange = async (event: ChangeEvent<HTMLInputElement>) => {
        const image = event.target.files?.[0];

        if (!image || capturing) return;

        setCapturing(true);
        setScanError(null);

        try {
            const debugPreview = await createOcrDebugPreview(image);
            setOcrDebugPreview(debugPreview);

            const ocrResult = await extractCardDataFromImage(image);
            const response = await submitScanCard({
                name: ocrResult.name,
                number: ocrResult.number,
            });
            const detection = parseApiResult(response, {
                name: ocrResult.name,
                number: ocrResult.number,
            });

            setLastDetected(detection);

            if (batchMode && isPremium) {
                setTempBatch((previous) => [detection, ...previous]);
            }

            if (!isPremium) {
                setFreeUsage((previous) => ({ ...previous, count: previous.count + 1 }));
            }
        } catch (uploadError) {
            console.error("Erro no upload da imagem:", uploadError);
            setScanError(buildScanErrorMessage(uploadError));
        } finally {
            event.target.value = "";
            setCapturing(false);
        }
    };

    const handleCapture = async () => {
        if (!videoRef.current || capturing || !canCapture) return;

        setCapturing(true);
        setScanError(null);

        try {
            const sourceWidth = videoRef.current.videoWidth;
            const sourceHeight = videoRef.current.videoHeight;
            const cardAspectRatio = 63 / 88;

            let cropWidth = sourceWidth * 0.82;
            let cropHeight = cropWidth / cardAspectRatio;

            if (cropHeight > sourceHeight * 0.9) {
                cropHeight = sourceHeight * 0.9;
                cropWidth = cropHeight * cardAspectRatio;
            }

            const cropX = (sourceWidth - cropWidth) / 2;
            const cropY = (sourceHeight - cropHeight) / 2;

            const canvas = document.createElement("canvas");
            canvas.width = Math.round(cropWidth);
            canvas.height = Math.round(cropHeight);

            const context = canvas.getContext("2d");
            if (!context) {
                throw new Error("Nao foi possivel criar contexto 2D");
            }

            context.drawImage(
                videoRef.current,
                cropX,
                cropY,
                cropWidth,
                cropHeight,
                0,
                0,
                canvas.width,
                canvas.height,
            );

            const blob = await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                    (outputBlob) => {
                        if (outputBlob) {
                            resolve(outputBlob);
                            return;
                        }

                        reject(new Error("Erro ao criar blob da captura"));
                    },
                    "image/jpeg",
                    0.9,
                );
            });

            const debugPreview = await createOcrDebugPreview(blob);
            setOcrDebugPreview(debugPreview);

            const ocrResult = await extractCardDataFromImage(blob);
            const response = await submitScanCard({
                name: ocrResult.name,
                number: ocrResult.number,
            });

            const detection = parseApiResult(response, {
                name: ocrResult.name,
                number: ocrResult.number,
            });

            setLastDetected(detection);

            if (batchMode && isPremium) {
                setTempBatch((previous) => [detection, ...previous]);
            }

            if (!isPremium) {
                setFreeUsage((previous) => ({ ...previous, count: previous.count + 1 }));
            }
        } catch (captureError) {
            console.error("Erro no scan:", captureError);
            setScanError(buildScanErrorMessage(captureError));
        } finally {
            setCapturing(false);
        }
    };

    const persistBatchCollection = () => {
        if (tempBatch.length === 0) {
            alert("Voce ainda nao adicionou cartas no lote temporario.");
            return;
        }

        const raw = localStorage.getItem(SAVED_BATCH_COLLECTIONS_KEY);
        const saved = raw ? (JSON.parse(raw) as CardDetection[][]) : [];
        saved.push(tempBatch);
        localStorage.setItem(SAVED_BATCH_COLLECTIONS_KEY, JSON.stringify(saved));

        setTempBatch([]);
        setBatchMode(false);
        alert("Colecao salva com sucesso na colecao permanente.");
    };

    if (error) {
        return (
            <div className="camera-error">
                <div className="error-content">
                    <h2>Erro ao acessar camera</h2>
                    <p>{error}</p>
                    <p className="error-hint">
                        Verifique se voce deu permissao para usar a camera nas configuracoes do
                        navegador.
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

            <div className="camera-dev-message">
                Funcao de camera em desenvolvimento. Melhorias de leitura serao adicionadas em
                breve.
            </div>

            <CaptureButton onCapture={handleCapture} disabled={capturing || !canCapture} />

            {isAdmin && (
                <>
                    <input
                        ref={uploadInputRef}
                        type="file"
                        accept="image/*"
                        className="scan-upload-input"
                        onChange={handleAdminUploadChange}
                    />
                    <button
                        type="button"
                        className="scan-upload-button"
                        onClick={handleAdminUploadClick}
                        disabled={capturing}
                    >
                        Upload imagem
                    </button>
                </>
            )}

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
                </section>
            )}

            {scanError && <div className="scan-error-message">{scanError}</div>}

            {ocrDebugPreview && (
                <section className="scan-debug-preview">
                    <p>Preview das regioes usadas no OCR</p>
                    <img src={ocrDebugPreview} alt="Preview das regioes OCR" />
                    <button type="button" onClick={() => setOcrDebugPreview(null)}>
                        Fechar preview
                    </button>
                </section>
            )}

            {isPremium && tempBatch.length > 0 && (
                <section className="temp-batch-panel">
                    <div>
                        <strong>Lote temporario</strong>
                        <p>{tempBatch.length} carta(s) aguardando confirmacao.</p>
                    </div>
                    <button type="button" onClick={persistBatchCollection}>
                        Manter colecao
                    </button>
                </section>
            )}

            {capturing && <div className="capturing-indicator">Lendo nome e numero...</div>}
        </div>
    );
}
