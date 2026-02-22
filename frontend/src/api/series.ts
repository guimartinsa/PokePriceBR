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
};

export type SeriesItem = {
    id: number;
    tcgdex_id: string;
    nome: string;
    logo: string | null;
    sets: SeriesSet[];
};

type SeriesApiResponse = SeriesItem[] | { results?: SeriesItem[] };

function normalizeSeries(items: SeriesItem[]): SeriesItem[] {
    return items.map((serie) => ({
        ...serie,
        sets: Array.isArray(serie.sets) ? serie.sets : [],
    }));
}

export async function fetchSeries(): Promise<SeriesItem[]> {
    const res = await api.get<SeriesApiResponse>("/series/");
    const payload = Array.isArray(res.data) ? res.data : res.data.results;

    if (!Array.isArray(payload)) {
        return [];
    }

    return normalizeSeries(payload);
}
