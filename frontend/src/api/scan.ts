export class ScanApiError extends Error {
    readonly status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = "ScanApiError";
        this.status = status;
    }
}

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

        return [normalized.endsWith("/scan") || normalized.endsWith("/scan/")
            ? normalized.replace(/\/+$/, "") + "/"
            : `${normalized}/scan/`];
    }

    const baseUrl = normalizeBaseUrl(import.meta.env.VITE_API_URL);

    return [
        `${baseUrl}/api/scan/`,
        `${baseUrl}/scan/`,
    ];
}

export async function uploadScan(image: Blob) {
    const formData = new FormData();
    formData.append("image", image, "scan.jpg");

    const scanUrls = getScanUrls();
    let lastError: Error | null = null;

    for (const url of scanUrls) {
        const res = await fetch(url, {
            method: "POST",
            body: formData,
        });

        if (res.status === 404) {
            lastError = new Error(`Endpoint de scan não encontrado: ${url}`);
            continue;
        }

        if (!res.ok) {
            let detail = "Erro ao enviar imagem";
            try {
                const errorPayload = await res.json();
                if (typeof errorPayload?.detail === "string" && errorPayload.detail.trim().length > 0) {
                    detail = errorPayload.detail;
                }
            } catch {
                // resposta sem JSON
            }
            throw new ScanApiError(detail, res.status);;
        }

        return res.json();
    }

    throw lastError ?? new Error("Erro ao enviar imagem");
}
