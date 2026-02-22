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

export async function fetchSeries(): Promise<SeriesItem[]> {
    const res = await api.get<SeriesItem[]>("/series/");
    return res.data;
}