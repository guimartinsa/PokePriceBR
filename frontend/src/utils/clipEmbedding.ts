import { env, pipeline } from "@xenova/transformers";

// Usa um repositório público estável do Transformers.js para evitar 401 em artefatos do modelo.
const CLIP_MODEL_ID = "Xenova/clip-vit-base-patch32";
const CLIP_IMAGE_SIZE = 224;
const EMBEDDING_DIMENSION = 512;

export class ClipEmbeddingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ClipEmbeddingError";
    }
}

type ClipExtractor = (
    input: ImageData | HTMLCanvasElement | HTMLImageElement | ImageBitmap,
    options?: Record<string, unknown>,
) => Promise<unknown>;

let extractorPromise: Promise<ClipExtractor> | null = null;

function configureTransformersRuntime() {
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
}

function normalizeL2(values: number[]): number[] {
    const norm = Math.sqrt(values.reduce((sum, value) => sum + value * value, 0));
    if (!Number.isFinite(norm) || norm <= 0) {
        throw new ClipEmbeddingError("Falha ao normalizar embedding CLIP.");
    }

    return values.map((value) => value / norm);
}

async function getClipExtractor(): Promise<ClipExtractor> {
    if (!extractorPromise) {
        configureTransformersRuntime();
        extractorPromise = (async () => {
            let latestError: unknown = null;

            try {
                const loaded = await pipeline("feature-extraction", CLIP_MODEL_ID, {
                    device: "webgpu",
                });
                return loaded as unknown as ClipExtractor;
            } catch (error) {
                latestError = error;

                try {
                    const loaded = await pipeline("feature-extraction", CLIP_MODEL_ID, {
                        device: "wasm",
                    });
                    return loaded as unknown as ClipExtractor;
                } catch (fallbackError) {
                    latestError = fallbackError;
                }
            }

            throw new ClipEmbeddingError(
                `Nao foi possivel carregar o modelo CLIP (${CLIP_MODEL_ID}): ${String(latestError)}`,
            );
        })().catch((error) => {
            extractorPromise = null;
            throw error;
        });
    }

    return extractorPromise;
}

function getSourceSize(source: HTMLImageElement | HTMLCanvasElement | ImageBitmap) {
    if (source instanceof HTMLImageElement) {
        const width = source.naturalWidth || source.width;
        const height = source.naturalHeight || source.height;
        return { width, height };
    }

    return {
        width: source.width,
        height: source.height,
    };
}

function toSquareCanvas(
    source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): HTMLCanvasElement {
    const { width, height } = getSourceSize(source);

    if (width <= 0 || height <= 0) {
        throw new ClipEmbeddingError("Dimensao invalida da imagem para gerar embedding CLIP.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = CLIP_IMAGE_SIZE;
    canvas.height = CLIP_IMAGE_SIZE;

    const context = canvas.getContext("2d");
    if (!context) {
        throw new ClipEmbeddingError("Nao foi possivel preparar canvas para CLIP.");
    }

    context.fillStyle = "#000000";
    context.fillRect(0, 0, CLIP_IMAGE_SIZE, CLIP_IMAGE_SIZE);

    const scale = Math.min(CLIP_IMAGE_SIZE / width, CLIP_IMAGE_SIZE / height);
    const drawWidth = Math.max(1, Math.round(width * scale));
    const drawHeight = Math.max(1, Math.round(height * scale));
    const offsetX = Math.floor((CLIP_IMAGE_SIZE - drawWidth) / 2);
    const offsetY = Math.floor((CLIP_IMAGE_SIZE - drawHeight) / 2);

    context.drawImage(source, offsetX, offsetY, drawWidth, drawHeight);
    return canvas;
}

function isFiniteNumber(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value);
}

function readTensorData(value: unknown): number[] | null {
    if (!value || typeof value !== "object") {
        return null;
    }

    const candidate = value as { data?: ArrayLike<number> };
    if (!candidate.data) {
        return null;
    }

    const raw = Array.from(candidate.data);
    return raw.every(isFiniteNumber) ? raw : null;
}

function flattenFiniteNumbers(value: unknown): number[] {
    if (isFiniteNumber(value)) {
        return [value];
    }

    const tensorData = readTensorData(value);
    if (tensorData) {
        return tensorData;
    }

    if (Array.isArray(value)) {
        return value.flatMap((entry) => flattenFiniteNumbers(entry));
    }

    return [];
}

function toEmbedding512(values: number[]): number[] {
    if (values.length === EMBEDDING_DIMENSION) {
        return values;
    }

    if (values.length > EMBEDDING_DIMENSION && values.length % EMBEDDING_DIMENSION === 0) {
        const chunks = values.length / EMBEDDING_DIMENSION;
        const pooled = new Array<number>(EMBEDDING_DIMENSION).fill(0);

        for (let index = 0; index < EMBEDDING_DIMENSION; index += 1) {
            let sum = 0;
            for (let chunk = 0; chunk < chunks; chunk += 1) {
                sum += values[chunk * EMBEDDING_DIMENSION + index];
            }
            pooled[index] = sum / chunks;
        }

        return pooled;
    }

    throw new ClipEmbeddingError(
        `Saida do CLIP com dimensao inesperada: ${values.length}. Esperado: 512.`,
    );
}

export async function extractClipEmbedding(
    image: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
): Promise<number[]> {
    const inputCanvas = toSquareCanvas(image);
    const extractor = await getClipExtractor();
    const output = await extractor(inputCanvas, {
        pooling: "mean",
        normalize: false,
    });

    const flattened = flattenFiniteNumbers(output);
    const embedding = toEmbedding512(flattened);
    return normalizeL2(embedding);
}
