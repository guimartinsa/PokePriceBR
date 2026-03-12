import { ClipEmbeddingError, extractClipEmbedding } from "../utils/clipEmbedding";

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

    if (error instanceof ClipEmbeddingError) {
        return new EmbeddingProcessingError(
            "Nao foi possivel carregar o modelo CLIP neste dispositivo. Recarregue a pagina e tente novamente.",
        );
    }

    if (error instanceof Error) {
        const message = String((error as { message?: unknown }).message ?? "").trim();
        if (message.length > 0) {
            return new EmbeddingProcessingError(message);
        }
    }

    return new EmbeddingProcessingError("Nao foi possivel gerar embedding da imagem.");
}

export async function extractImageEmbedding(imageBlob: Blob): Promise<number[]> {
    if (imageBlob.size <= 0) {
        throw new EmbeddingProcessingError("A imagem capturada esta vazia.");
    }

    const bitmap = await createImageBitmap(imageBlob);

    try {
        return await extractClipEmbedding(bitmap);
    } catch (error) {
        throw toProcessingError(error);
    } finally {
        bitmap.close();
    }
}
