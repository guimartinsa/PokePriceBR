import { ClipEmbeddingError, extractClipEmbedding } from "../utils/clipEmbedding";

const LEGACY_TARGET_WIDTH = 32;
const LEGACY_TARGET_HEIGHT = 32;
const TARGET_DIMENSION = 512;
const EPSILON = 1e-6;
const ENABLE_LEGACY_FALLBACK =
    (import.meta.env.VITE_ENABLE_LEGACY_EMBEDDING_FALLBACK ?? "true").toLowerCase() !== "false";

export class EmbeddingProcessingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "EmbeddingProcessingError";
    }
}

function l2Normalize(values: number[]): number[] {
    const norm = Math.hypot(...values);
    if (!Number.isFinite(norm) || norm <= 0) {
        throw new EmbeddingProcessingError("Falha ao normalizar embedding da imagem.");
    }

    return values.map((value) => value / norm);
}

function reduceToFixedSize(values: number[], targetSize: number): number[] {
    if (values.length < targetSize) {
        throw new EmbeddingProcessingError("Dimensao insuficiente para gerar embedding.");
    }

    const stride = values.length / targetSize;
    const reduced = new Array<number>(targetSize).fill(0);

    for (let index = 0; index < targetSize; index += 1) {
        const start = Math.floor(index * stride);
        const end = Math.max(start + 1, Math.floor((index + 1) * stride));
        let sum = 0;

        for (let cursor = start; cursor < end; cursor += 1) {
            sum += values[cursor];
        }

        reduced[index] = sum / (end - start);
    }

    return reduced;
}

function clamp01(value: number): number {
    if (value <= 0) return 0;
    if (value >= 1) return 1;
    return value;
}

function computeRobustFeatures(pixels: Uint8ClampedArray): number[] {
    const totalPixels = LEGACY_TARGET_WIDTH * LEGACY_TARGET_HEIGHT;
    const red = new Array<number>(totalPixels);
    const green = new Array<number>(totalPixels);
    const blue = new Array<number>(totalPixels);
    const luminance = new Array<number>(totalPixels);

    let meanRed = 0;
    let meanGreen = 0;
    let meanBlue = 0;

    for (let index = 0; index < totalPixels; index += 1) {
        const base = index * 4;
        const r = pixels[base] / 255;
        const g = pixels[base + 1] / 255;
        const b = pixels[base + 2] / 255;

        red[index] = r;
        green[index] = g;
        blue[index] = b;

        meanRed += r;
        meanGreen += g;
        meanBlue += b;
    }

    meanRed /= totalPixels;
    meanGreen /= totalPixels;
    meanBlue /= totalPixels;

    const globalMean = (meanRed + meanGreen + meanBlue) / 3;
    const gainRed = globalMean / Math.max(meanRed, EPSILON);
    const gainGreen = globalMean / Math.max(meanGreen, EPSILON);
    const gainBlue = globalMean / Math.max(meanBlue, EPSILON);

    for (let index = 0; index < totalPixels; index += 1) {
        const r = clamp01(red[index] * gainRed);
        const g = clamp01(green[index] * gainGreen);
        const b = clamp01(blue[index] * gainBlue);

        red[index] = r;
        green[index] = g;
        blue[index] = b;
        luminance[index] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const gradients = new Array<number>(totalPixels).fill(0);
    const pixelAt = (x: number, y: number) => luminance[y * LEGACY_TARGET_WIDTH + x];

    for (let y = 1; y < LEGACY_TARGET_HEIGHT - 1; y += 1) {
        for (let x = 1; x < LEGACY_TARGET_WIDTH - 1; x += 1) {
            const gx = pixelAt(x + 1, y) - pixelAt(x - 1, y);
            const gy = pixelAt(x, y + 1) - pixelAt(x, y - 1);
            gradients[y * LEGACY_TARGET_WIDTH + x] = Math.hypot(gx, gy);
        }
    }

    const values: number[] = [];
    for (let index = 0; index < totalPixels; index += 1) {
        values.push(red[index], green[index], blue[index], gradients[index]);
    }

    return values;
}

function extractLegacyEmbeddingFromBitmap(bitmap: ImageBitmap): number[] {
    const canvas = document.createElement("canvas");
    canvas.width = LEGACY_TARGET_WIDTH;
    canvas.height = LEGACY_TARGET_HEIGHT;

    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
        throw new EmbeddingProcessingError("Nao foi possivel preparar canvas para embedding.");
    }

    context.drawImage(bitmap, 0, 0, LEGACY_TARGET_WIDTH, LEGACY_TARGET_HEIGHT);
    const pixels = context.getImageData(0, 0, LEGACY_TARGET_WIDTH, LEGACY_TARGET_HEIGHT).data;
    const values = computeRobustFeatures(pixels);

    const reduced = reduceToFixedSize(values, TARGET_DIMENSION);
    return l2Normalize(reduced);
}

function toProcessingError(error: unknown): EmbeddingProcessingError {
    if (error instanceof EmbeddingProcessingError) {
        return error;
    }

    if (error instanceof ClipEmbeddingError) {
        return new EmbeddingProcessingError(error.message);
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return new EmbeddingProcessingError(error.message);
    }

    return new EmbeddingProcessingError("Nao foi possivel gerar embedding da imagem.");
}

export async function extractImageEmbedding(imageBlob: Blob): Promise<number[]> {
    if (imageBlob.size <= 0) {
        throw new EmbeddingProcessingError("A imagem capturada esta vazia.");
    }

    const bitmap = await createImageBitmap(imageBlob);

    try {
        try {
            return await extractClipEmbedding(bitmap);
        } catch (clipError) {
            if (!ENABLE_LEGACY_FALLBACK) {
                throw toProcessingError(clipError);
            }

            console.warn("Falha ao gerar embedding CLIP. Aplicando fallback legado.", clipError);
            return extractLegacyEmbeddingFromBitmap(bitmap);
        }
    } catch (error) {
        throw toProcessingError(error);
    } finally {
        bitmap.close();
    }
}
