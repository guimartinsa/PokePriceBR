export async function uploadScan(image: Blob) {
    const formData = new FormData();
    formData.append("image", image, "scan.jpg");

    const res = await fetch(
        import.meta.env.VITE_API_URL + "/api/scan/",
        {
            method: "POST",
            body: formData,
        }
    );

    if (!res.ok) {
        throw new Error("Erro ao enviar imagem");
    }

    return res.json();
}
