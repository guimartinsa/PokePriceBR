import * as Tesseract from "tesseract.js";

const OCR_CHAR_WHITELIST = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789/";
const CARD_NUMBER_REGEX = /\d{1,3}\/\d{1,3}/;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_PROCESSING_WIDTH = 1280;
const MAX_PROCESSING_HEIGHT = 1280;
const NAME_REGION_HEIGHT_RATIO = 0.32;
const NUMBER_REGION_START_RATIO = 0.72;
const NUMBER_REGION_WIDTH_RATIO = 0.58;
const CONTRAST_MULTIPLIER = 1.6;

type ExtractedFields = {
    name: string | null;
    number: string | null;
};

export type OcrCardData = {
    name: string;
    number: string;
    rawText: string;
};

export type OcrDebugRegions = {
    nameRegion: CanvasRegion;
    numberRegion: CanvasRegion;
};

export class OcrProcessingError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "OcrProcessingError";
    }
}

let worker: Tesseract.Worker | null = null;
let workerPromise: Promise<Tesseract.Worker> | null = null;

function validateImage(image: Blob) {
    if (image.size <= 0) {
        throw new OcrProcessingError("A imagem capturada está vazia.");
    }

    if (image.size > MAX_IMAGE_SIZE_BYTES) {
        throw new OcrProcessingError("A imagem excede o limite de 5MB para OCR.");
    }
}

function clampByte(value: number) {
    return Math.max(0, Math.min(255, Math.round(value)));
}

function getScaledDimensions(width: number, height: number) {
    const scale = Math.min(
        1,
        MAX_PROCESSING_WIDTH / width,
        MAX_PROCESSING_HEIGHT / height,
    );

    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
    };
}

function applyOcrPreprocessing(
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
) {
    const frame = context.getImageData(0, 0, width, height);
    const pixels = frame.data;

    for (let index = 0; index < pixels.length; index += 4) {
        const red = pixels[index];
        const green = pixels[index + 1];
        const blue = pixels[index + 2];

        const grayscale = red * 0.299 + green * 0.587 + blue * 0.114;
        const contrasted = clampByte((grayscale - 128) * CONTRAST_MULTIPLIER + 128);

        pixels[index] = contrasted;
        pixels[index + 1] = contrasted;
        pixels[index + 2] = contrasted;
    }

    context.putImageData(frame, 0, 0);
}

async function preprocessImage(image: Blob): Promise<HTMLCanvasElement> {
    const bitmap = await createImageBitmap(image);

    try {
        const { width, height } = getScaledDimensions(bitmap.width, bitmap.height);
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const context = canvas.getContext("2d");
        if (!context) {
            throw new OcrProcessingError("Não foi possível preparar o canvas para OCR.");
        }

        context.drawImage(bitmap, 0, 0, width, height);
        applyOcrPreprocessing(context, width, height);

        return canvas;
    } finally {
        bitmap.close();
    }
}

type CanvasRegion = {
    x: number;
    y: number;
    width: number;
    height: number;
};

function getOcrRegions(canvas: HTMLCanvasElement): OcrDebugRegions {
    return {
        nameRegion: getNameRegion(canvas),
        numberRegion: getNumberRegion(canvas),
    };
}

function cropRegion(source: HTMLCanvasElement, region: CanvasRegion): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(region.width));
    canvas.height = Math.max(1, Math.round(region.height));

    const context = canvas.getContext("2d");
    if (!context) {
        throw new OcrProcessingError("Não foi possível criar recorte para OCR.");
    }

    context.drawImage(
        source,
        Math.max(0, Math.round(region.x)),
        Math.max(0, Math.round(region.y)),
        Math.round(region.width),
        Math.round(region.height),
        0,
        0,
        canvas.width,
        canvas.height,
    );

    return canvas;
}

function normalizeLine(line: string) {
    return line
        .replace(/[^\w/ ]+/g, " ")
        .replace(/_/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

function normalizeNumber(line: string): string | null {
    const compact = line
        .replace(/\s+/g, "")
        .replace(/[Oo]/g, "0")
        .replace(/[Il]/g, "1");

    const match = compact.match(CARD_NUMBER_REGEX);
    return match ? match[0] : null;
}

function findNameNearIndex(lines: string[], startIndex: number): string | null {
    for (let index = startIndex; index >= 0; index -= 1) {
        const candidate = lines[index];
        if (/[A-Za-z]/.test(candidate) && !normalizeNumber(candidate)) {
            return candidate;
        }
    }

    return null;
}

function extractFieldsFromText(text: string): ExtractedFields {
    const lines = text
        .split(/\r?\n/)
        .map((line) => normalizeLine(line))
        .filter((line) => line.length > 0);

    let number: string | null = null;
    let numberLineIndex = -1;

    for (let index = 0; index < lines.length; index += 1) {
        const parsedNumber = normalizeNumber(lines[index]);
        if (parsedNumber) {
            number = parsedNumber;
            numberLineIndex = index;
            break;
        }
    }

    if (!number) {
        number = normalizeNumber(normalizeLine(text));
    }

    let name: string | null = null;

    if (numberLineIndex > 0) {
        name = findNameNearIndex(lines, numberLineIndex - 1);
    }

    if (!name) {
        name =
            lines.find((line) => /[A-Za-z]/.test(line) && !normalizeNumber(line)) ?? null;
    }

    return { name, number };
}

async function recognizeText(
    workerInstance: Tesseract.Worker,
    image: HTMLCanvasElement,
) {
    const result = await workerInstance.recognize(image);
    return result.data.text ?? "";
}

export async function createOcrDebugPreview(image: Blob): Promise<string> {
    validateImage(image);

    const preprocessedCanvas = await preprocessImage(image);
    const regions = getOcrRegions(preprocessedCanvas);
    const debugCanvas = document.createElement("canvas");
    debugCanvas.width = preprocessedCanvas.width;
    debugCanvas.height = preprocessedCanvas.height;

    const context = debugCanvas.getContext("2d");
    if (!context) {
        throw new OcrProcessingError("Não foi possível criar preview de depuração do OCR.");
    }

    context.drawImage(preprocessedCanvas, 0, 0);

    context.strokeStyle = "#00f57a";
    context.lineWidth = Math.max(2, Math.round(debugCanvas.width * 0.006));
    context.strokeRect(
        regions.nameRegion.x,
        regions.nameRegion.y,
        regions.nameRegion.width,
        regions.nameRegion.height,
    );

    context.strokeStyle = "#ff4d6d";
    context.strokeRect(
        regions.numberRegion.x,
        regions.numberRegion.y,
        regions.numberRegion.width,
        regions.numberRegion.height,
    );

    context.fillStyle = "rgba(0, 0, 0, 0.58)";
    context.fillRect(12, 12, 190, 56);
    context.fillStyle = "#fff";
    context.font = "bold 14px sans-serif";
    context.fillText("Verde: area do nome", 20, 34);
    context.fillText("Rosa: area do numero", 20, 56);

    return debugCanvas.toDataURL("image/png");
}

function getNameRegion(canvas: HTMLCanvasElement): CanvasRegion {
    return {
        x: 0,
        y: 0,
        width: canvas.width,
        height: Math.max(1, Math.round(canvas.height * NAME_REGION_HEIGHT_RATIO)),
    };
}

function getNumberRegion(canvas: HTMLCanvasElement): CanvasRegion {
    const startY = Math.min(
        canvas.height - 1,
        Math.round(canvas.height * NUMBER_REGION_START_RATIO),
    );

    return {
        x: 0,
        y: startY,
        width: Math.max(1, Math.round(canvas.width * NUMBER_REGION_WIDTH_RATIO)),
        height: Math.max(1, canvas.height - startY),
    };
}

export async function getWorker(): Promise<Tesseract.Worker> {
    if (worker) {
        return worker;
    }

    if (!workerPromise) {
        workerPromise = (async () => {
            const createdWorker = await Tesseract.createWorker("eng");
            await createdWorker.setParameters({
                tessedit_char_whitelist: OCR_CHAR_WHITELIST,
                preserve_interword_spaces: "1",
            });
            worker = createdWorker;
            return createdWorker;
        })().catch((error: unknown) => {
            workerPromise = null;
            throw error;
        });
    }

    return workerPromise;
}

export async function extractCardDataFromImage(image: Blob): Promise<OcrCardData> {
    validateImage(image);

    const preprocessedCanvas = await preprocessImage(image);
    const workerInstance = await getWorker();

    const nameRegion = cropRegion(preprocessedCanvas, getNameRegion(preprocessedCanvas));
    const numberRegion = cropRegion(preprocessedCanvas, getNumberRegion(preprocessedCanvas));

    const nameText = await recognizeText(workerInstance, nameRegion);
    const numberText = await recognizeText(workerInstance, numberRegion);

    let mergedText = `${nameText}\n${numberText}`;
    let extracted = extractFieldsFromText(mergedText);

    if (!extracted.name || !extracted.number) {
        const fallbackText = await recognizeText(workerInstance, preprocessedCanvas);
        mergedText = `${mergedText}\n${fallbackText}`;
        extracted = extractFieldsFromText(mergedText);
    }

    if (!extracted.name || !extracted.number) {
        throw new OcrProcessingError(
            "Não foi possível extrair nome e número da carta com confiança.",
        );
    }

    return {
        name: extracted.name,
        number: extracted.number,
        rawText: mergedText.trim(),
    };
}
