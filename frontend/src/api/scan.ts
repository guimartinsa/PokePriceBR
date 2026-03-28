export class ScanApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ScanApiError";
        this.status = status;
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

function dedupeUrls(urls: string[]): string[] {
    return Array.from(new Set(urls));
}

function getScanUrls(): string[] {
    const explicitScanUrl = import.meta.env.VITE_SCAN_API_URL as string | undefined;

    if (explicitScanUrl) {
        const normalized = (/^https?:\/\//i.test(explicitScanUrl)
            ? explicitScanUrl
            : `https://${explicitScanUrl}`
        ).replace(/\/+$/, "");
        const normalizedWithoutApi = normalized.replace(/\/api$/i, "");

        if (normalized.endsWith("/scan-card")) {
            return [normalized.replace(/\/scan-card$/i, "/scan") + "/"];
        }

        if (normalized.endsWith("/scan")) {
            return [normalized + "/"];
        }

        return dedupeUrls([
            `${normalized}/scan/`,
            `${normalizedWithoutApi}/api/scan/`,
        ]);
    }

    const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    return dedupeUrls([
        `${baseUrl}/api/scan/`,
        `${baseUrl}/scan/`,
    ]);
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

    const scanUrls = getScanUrls();
    let lastError: Error | null = null;

    for (const url of scanUrls) {
        let response: Response;

        try {
            response = await fetch(url, {
                method: "POST",
                headers: buildAuthHeaders(),
                body: JSON.stringify(payload),
            });
        } catch (networkError) {
            lastError = networkError instanceof Error
                ? networkError
                : new Error(String(networkError));
            continue;
        }

        if (response.status === 404) {
            lastError = new Error(`Endpoint de scan não encontrado: ${url}`);
            continue;
        }

        if (!response.ok) {
            let detail = "Erro ao consultar embedding";

            try {
                const errorPayload = await response.json() as Record<string, unknown>;
                if (typeof errorPayload.detail === "string" && errorPayload.detail.trim()) {
                    detail = errorPayload.detail;
                } else if (typeof errorPayload.error === "string" && errorPayload.error.trim()) {
                    detail = errorPayload.error;
                }
            } catch {
                // resposta sem json
            }

            throw new ScanApiError(detail, response.status);
        }

        return response.json();
    }

    throw lastError ?? new Error("Todas as URLs de scan falharam.");
}
