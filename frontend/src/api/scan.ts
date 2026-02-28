function getScanUrl(): string {
    const rawUrl = import.meta.env.VITE_API_URL;
    const baseUrl = rawUrl
        ? (/^https?:\/\//i.test(rawUrl) ? rawUrl : `https://${rawUrl}`)
            .replace(/\/+$/, "")
            .replace(/\/api$/, "")
        : "http://127.0.0.1:8000";

    return `${baseUrl}/api/scan/`;
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
