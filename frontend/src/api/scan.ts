import { api } from "./api";

type ScanFallbackCard = {
    id: number;
    nome: string;
    numero_completo?: string;
    numero?: string;
    preco_med?: string | null;
};

function getScanUrl(): string {
    const rawUrl = import.meta.env.VITE_API_URL;
    const baseUrl = rawUrl
        ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`)
            .replace(/\/+$/, "")
            .replace(/\/api$/, "")
        : "http://127.0.0.1:8000";

    return `${baseUrl}/api/scan/`;
}

export async function fetchRandomRealCard(): Promise<ScanFallbackCard | null> {
    const firstPage = await api.get("/cards/", { params: { page: 1 } });
    const count = Number(firstPage.data?.count ?? 0);
    const firstResults = Array.isArray(firstPage.data?.results)
        ? (firstPage.data.results as ScanFallbackCard[])
        : [];

    if (!count || firstResults.length === 0) return null;

    const pageSize = firstResults.length;
    const randomIndex = Math.floor(Math.random() * count);
    const randomPage = Math.floor(randomIndex / pageSize) + 1;

    if (randomPage === 1) {
        return firstResults[randomIndex % pageSize] ?? null;
    }

    const randomPageResponse = await api.get("/cards/", {
        params: { page: randomPage },
    });

    const randomResults = Array.isArray(randomPageResponse.data?.results)
        ? (randomPageResponse.data.results as ScanFallbackCard[])
        : [];

    return randomResults[randomIndex % pageSize] ?? randomResults[0] ?? null;
}

export async function uploadScan(image: Blob) {
    const formData = new FormData();
    formData.append("image", image, "scan.jpg");

    const res = await fetch(
        getScanUrl(), {
        method: "POST",
        body: formData,
    }
    );

    if (!res.ok) {
        throw new Error("Erro ao enviar imagem");
    }

    return res.json();
}
