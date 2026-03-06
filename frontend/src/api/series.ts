import { api } from "./api";

export type SeriesSet = {
    id: number;
    nome: string;
    codigo_liga: string | null;
    logo: string | null;
    release_date: string | null;
    serie_id: string | null;
    serie_nome: string | null;
    tcgdex_id: string | null;
    cards_total?: number;
};

export type SeriesItem = {
    id: number;
    tcgdex_id: string;
    nome: string;
    logo: string | null;
    sets: SeriesSet[];
};

type SeriesApiResponse = SeriesItem[] | { results?: SeriesItem[] };

let seriesCache: SeriesItem[] | null = null;
let inFlightSeriesRequest: Promise<SeriesItem[]> | null = null;

function normalizeSeries(items: SeriesItem[]): SeriesItem[] {
    return items.map((serie) => ({
        ...serie,
        sets: Array.isArray(serie.sets)
            ? serie.sets.map((setItem) => ({
                ...setItem,
                cards_total: typeof setItem.cards_total === "number" ? setItem.cards_total : 0,
            }))
            : [],
    }));
}

export async function fetchSeries(force = false): Promise<SeriesItem[]> {
    if (!force && seriesCache) {
        return seriesCache;
    }

    if (!force && inFlightSeriesRequest) {
        return inFlightSeriesRequest;
    }

    inFlightSeriesRequest = api
        .get<SeriesApiResponse>("/series/")
        .then((res) => {
            const payload = Array.isArray(res.data) ? res.data : res.data.results;
            const normalized = Array.isArray(payload) ? normalizeSeries(payload) : [];
            seriesCache = normalized;
            return normalized;
        })
        .finally(() => {
            inFlightSeriesRequest = null;
        });

    return inFlightSeriesRequest;
}

