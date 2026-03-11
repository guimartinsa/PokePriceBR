const TARGET_WIDTH = 32;
const TARGET_HEIGHT = 32;
const TARGET_DIMENSION = 512;

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
        throw new EmbeddingProcessingError("Dimensão insuficiente para gerar embedding.");
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

export async function extractImageEmbedding(imageBlob: Blob): Promise<number[]> {
    if (imageBlob.size <= 0) {
        throw new EmbeddingProcessingError("A imagem capturada está vazia.");
    }

    const bitmap = await createImageBitmap(imageBlob);

    try {
        const canvas = document.createElement("canvas");
        canvas.width = TARGET_WIDTH;
        canvas.height = TARGET_HEIGHT;

        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
            throw new EmbeddingProcessingError("Não foi possível preparar canvas para embedding.");
        }

        context.drawImage(bitmap, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);
        const pixels = context.getImageData(0, 0, TARGET_WIDTH, TARGET_HEIGHT).data;
        const values: number[] = [];

        for (let index = 0; index < pixels.length; index += 4) {
            const red = pixels[index] / 255;
            const green = pixels[index + 1] / 255;
            const blue = pixels[index + 2] / 255;
            values.push(red, green, blue);
        }

        const reduced = reduceToFixedSize(values, TARGET_DIMENSION);
        return l2Normalize(reduced);
    } finally {
        bitmap.close();
    }
}
