export function captureFrame(video: HTMLVideoElement): Blob {
    const canvas = document.createElement("canvas");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise((resolve) => {
        canvas.toBlob(
            (blob) => resolve(blob!),
            "image/jpeg",
            0.9 // compressão controlada
        );
    }) as unknown as Blob;
}
