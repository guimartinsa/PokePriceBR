const TARGET_MIN_WIDTH = 512;
const TARGET_MAX_WIDTH = 768;
const JPEG_QUALITY = 0.9;

export class EmbeddingProcessingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EmbeddingProcessingError";
    }
}

function toProcessingError(error: unknown): EmbeddingProcessingError {
    if (error instanceof EmbeddingProcessingError) {
        return error;
    }

    if (error instanceof Error) {
        const message = String((error as { message?: unknown }).message ?? "").trim();
        if (message.length > 0) {
            return new EmbeddingProcessingError(message);
        }
    }

    return new EmbeddingProcessingError("Nao foi possivel gerar embedding da imagem.");
}

function clampWidth(width: number): number {
    if (width < TARGET_MIN_WIDTH) return TARGET_MIN_WIDTH;
    if (width > TARGET_MAX_WIDTH) return TARGET_MAX_WIDTH;
    return width;
}

async function toResizedCanvas(imageBlob: Blob): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(imageBlob);

    try {
        if (bitmap.width <= 0 || bitmap.height <= 0) {
            throw new EmbeddingProcessingError("Imagem capturada com dimensoes invalidas.");
        }

        const targetWidth = clampWidth(bitmap.width);
        const scale = targetWidth / bitmap.width;
        const targetHeight = Math.max(1, Math.round(bitmap.height * scale));

        const canvas = document.createElement("canvas");
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        const context = canvas.getContext("2d");
        if (!context) {
            throw new EmbeddingProcessingError("Nao foi possivel preparar canvas para processamento.");
        }

        context.drawImage(bitmap, 0, 0, targetWidth, targetHeight);
        return canvas;
    } finally {
        bitmap.close();
    }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!blob) {
                    reject(new EmbeddingProcessingError("Falha ao gerar imagem otimizada para scan."));
                    return;
                }
                resolve(blob);
            },
            "image/jpeg",
            JPEG_QUALITY,
        );
    });
}

async function blobToBase64(blob: Blob): Promise<string> {
    const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
        reader.onerror = () => reject(new EmbeddingProcessingError("Falha ao converter imagem para base64."));
        reader.readAsDataURL(blob);
    });

    const [, base64 = ""] = dataUrl.split(",", 2);
    if (!base64) {
        throw new EmbeddingProcessingError("Nao foi possivel serializar imagem para OCR.");
    }

    return base64;
}

export async function buildScanInput(imageBlob: Blob): Promise<{ imageBase64: string }> {
    if (imageBlob.size <= 0) {
        throw new EmbeddingProcessingError("A imagem capturada esta vazia.");
    }

    try {
        const canvas = await toResizedCanvas(imageBlob);
        const optimizedBlob = await canvasToJpegBlob(canvas);
        const imageBase64 = await blobToBase64(optimizedBlob);
        return { imageBase64 };
    } catch (error) {
        throw toProcessingError(error);
    }
}
