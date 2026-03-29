export class ScanApiError extends Error {
    readonly status: number;
    readonly payload?: Record<string, unknown>;

    constructor(message: string, status: number, payload?: Record<string, unknown>) {
        super(message);
        this.name = "ScanApiError";
        this.status = status;
        this.payload = payload;
    }
}

export type ScanEmbeddingPayload = {
    image: string;
    embedding?: number[];
};

function normalizeBaseUrl(rawUrl?: string): string {
    if (!rawUrl) {
        return import.meta.env.PROD
            ? "https://pokepricebr.onrender.com"
            : "http://127.0.0.1:8000";
    }

    return (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`)
        .replace(/\/+$/, "")
        .replace(/\/api$/, "");
}

function getScanUrl(): string {
    const explicitScanUrl = import.meta.env.VITE_SCAN_API_URL as string | undefined;

    if (explicitScanUrl) {
        const normalized = (/^https?:\/\//i.test(explicitScanUrl)
            ? explicitScanUrl
            : `https://${explicitScanUrl}`
        ).replace(/\/+$/, "");
        const normalizedWithoutApi = normalized.replace(/\/api$/i, "");

        if (normalized.endsWith("/scan-card")) {
            return normalized.replace(/\/scan-card$/i, "/scan") + "/";
        }

        if (normalized.endsWith("/scan")) {
            return normalized + "/";
        }

        return `${normalizedWithoutApi}/api/scan/`;
    }

    const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    return `${baseUrl}/api/scan/`;
}

function buildAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("access");
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if (!token) {
        return headers;
    }

    return {
        ...headers,
        Authorization: `Bearer ${token}`,
    };
}

function validatePayload(payload: ScanEmbeddingPayload) {
    if (typeof payload.image !== "string" || payload.image.trim().length === 0) {
        throw new Error("Imagem base64 inválida para envio.");
    }

    if (payload.embedding !== undefined) {
        if (!Array.isArray(payload.embedding) || payload.embedding.length !== 512) {
            throw new Error("Embedding inválido para envio. São esperados 512 valores.");
        }
    }
}

export async function submitScanEmbedding(payload: ScanEmbeddingPayload): Promise<unknown> {
    validatePayload(payload);

    const scanUrl = getScanUrl();
    let response: Response;

    try {
        response = await fetch(scanUrl, {
            method: "POST",
            headers: buildAuthHeaders(),
            body: JSON.stringify(payload),
        });
    } catch (networkError) {
        throw networkError instanceof Error
            ? networkError
            : new Error(String(networkError));
    }

    if (!response.ok) {
        let detail = "Erro ao consultar embedding";
        let errorPayload: Record<string, unknown> | undefined;

        try {
            errorPayload = await response.json() as Record<string, unknown>;
            if (typeof errorPayload.detail === "string" && errorPayload.detail.trim()) {
                detail = errorPayload.detail;
            } else if (typeof errorPayload.error === "string" && errorPayload.error.trim()) {
                detail = errorPayload.error;
            }
            if (response.status === 404 && detail === "Erro ao consultar embedding") {
                detail = "Nao foi possivel localizar carta com os dados extraidos.";
            }
        } catch {
            const contentType = response.headers.get("content-type") ?? "";
            if (response.status === 404 && !contentType.includes("application/json")) {
                throw new Error(`Endpoint de scan não encontrado: ${scanUrl}`);
            }
        }

        throw new ScanApiError(detail, response.status, errorPayload);
    }

    return response.json();
}
