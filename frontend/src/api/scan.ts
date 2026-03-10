export class ScanApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ScanApiError";
        this.status = status;
    }
}

export type ScanCardPayload = {
    name: string;
    number: string;
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

function getScanUrls(): string[] {
    const explicitScanUrl = import.meta.env.VITE_SCAN_API_URL as string | undefined;

    if (explicitScanUrl) {
        const normalized = (/^https?:\/\//i.test(explicitScanUrl)
            ? explicitScanUrl
            : `https://${explicitScanUrl}`
        ).replace(/\/+$/, "");

        return normalized.endsWith("/scan-card")
            ? [`${normalized}/`]
            : [`${normalized}/scan-card/`];
    }

    const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);
    return [`${baseUrl}/api/scan-card/`];
}

function buildAuthHeaders(): HeadersInit {
    const token = localStorage.getItem("access");
    const headers: HeadersInit = {
        "Content-Type": "application/json",
    };

    if (token) {
        return {
            ...headers,
            Authorization: `Bearer ${token}`,
        };
    }

    return headers;
}

function normalizePayload(payload: ScanCardPayload): ScanCardPayload {
    return {
        name: payload.name.trim(),
        number: payload.number.trim(),
    };
}

function validatePayload(payload: ScanCardPayload) {
    if (!payload.name) {
        throw new Error("Nome da carta não pode ser vazio.");
    }

    if (!payload.number || !/\d{1,3}\/\d{1,3}/.test(payload.number)) {
        throw new Error("Número da carta inválido para envio.");
    }
}

export async function submitScanCard(payload: ScanCardPayload): Promise<unknown> {
    const normalizedPayload = normalizePayload(payload);
    validatePayload(normalizedPayload);

    const scanUrls = getScanUrls();
    let lastError: Error | null = null;

    for (const url of scanUrls) {
        let response: Response;

        try {
            response = await fetch(url, {
                method: "POST",
                headers: buildAuthHeaders(),
                body: JSON.stringify(normalizedPayload),
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
            let detail = "Erro ao enviar dados da carta";

            try {
                const errorPayload = await response.json() as Record<string, unknown>;

                if (
                    typeof errorPayload.detail === "string" &&
                    errorPayload.detail.trim().length > 0
                ) {
                    detail = errorPayload.detail;
                } else if (
                    typeof errorPayload.error === "string" &&
                    errorPayload.error.trim().length > 0
                ) {
                    detail = errorPayload.error;
                }
            } catch {
                // resposta sem payload JSON válido
            }

            throw new ScanApiError(detail, response.status);
        }

        return response.json();
    }

    throw lastError ?? new Error("Todas as URLs de scan falharam.");
}
