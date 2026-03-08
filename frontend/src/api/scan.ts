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
            ? "http://api.pricedex.com.br/"
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

    // ⚠️ NUNCA inclua Content-Type aqui quando usar FormData.
    // O fetch define automaticamente "multipart/form-data; boundary=..." ao detectar FormData.
    // Definir manualmente quebra o boundary e o Django não consegue ler request.FILES.
    return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Cria um FormData fresco a cada chamada.
 * Necessário para evitar reuso de stream já consumido pelo fetch em tentativas anteriores.
 */
function buildFormData(image: Blob): FormData {
    const formData = new FormData();

    // O terceiro argumento define o filename — necessário para que o Django
    // reconheça o campo como um arquivo válido em request.FILES["image"].
    formData.append("image", image, "scan.jpg");

    return formData;
}

export async function uploadScan(image: Blob): Promise<unknown> {
    const scanUrls = getScanUrls();
    let lastError: Error | null = null;

    console.log("[uploadScan] Iniciando envio. URLs candidatas:", scanUrls);
    console.log("[uploadScan] Tamanho da imagem (bytes):", image.size, "| Tipo:", image.type);

    for (const url of scanUrls) {
        console.log(`[uploadScan] Tentando: ${url}`);

        // ✅ FormData recriado a cada iteração — evita reuso de stream consumido
        const formData = buildFormData(image);

        let res: Response;

        try {
            res = await fetch(url, {
                method: "POST",
                body: formData,

                // ✅ Apenas Authorization — fetch cuida do Content-Type + boundary
                headers: buildAuthHeaders(),
            });
        } catch (networkError) {
            console.warn(`[uploadScan] Erro de rede em ${url}:`, networkError);
            lastError = networkError instanceof Error
                ? networkError
                : new Error(String(networkError));
            continue;
        }

        console.log(`[uploadScan] Resposta de ${url}: status ${res.status}`);

        if (res.status === 404) {
            lastError = new Error(`Endpoint de scan não encontrado: ${url}`);
            console.warn(`[uploadScan] 404 em ${url}, tentando próxima URL...`);
            continue;
        }

        if (!res.ok) {
            let detail = "Erro ao enviar imagem";

            try {
                const errorPayload = await res.json();
                console.error("[uploadScan] Payload de erro do backend:", errorPayload);

                if (typeof errorPayload?.detail === "string" && errorPayload.detail.trim()) {
                    detail = errorPayload.detail;
                } else if (typeof errorPayload?.error === "string" && errorPayload.error.trim()) {
                    detail = errorPayload.error;
                }
            } catch {
                console.warn("[uploadScan] Resposta de erro sem JSON válido.");
            }

            throw new ScanApiError(detail, res.status);
        }

        const data = await res.json();
        console.log("[uploadScan] Sucesso! Resposta:", data);
        return data;
    }

    throw lastError ?? new Error("Todas as URLs de scan falharam.");
}