import { api } from "./api";

export type SetOption = {
    id: number;
    nome: string;
    codigo: string;
};

export type SetLookupItem = {
    id: number;
    nome: string;
    codigo_liga: string | null;
    logo: string | null;
    release_date: string | null;
    serie_id: string | null;
    serie_nome: string | null;
    tcgdex_id: string | null;
};

type SetListApiResponse = SetLookupItem[] | { results?: SetLookupItem[] };

export async function fetchSets(query: string): Promise<SetOption[]> {
    if (!query || query.length < 2) return [];

    const res = await api.get<SetOption[]>("/sets/autocomplete/", {
        params: { q: query },
    });

    if (!Array.isArray(res.data)) {
        return [];
    }

    return res.data.map((item) => ({
        ...item,
        codigo: item.codigo ?? "",
    }));
}

export async function fetchSetByCode(setCode: string): Promise<SetLookupItem | null> {
    const res = await api.get<SetListApiResponse>("/sets/", {
        params: { codigo: setCode },
    });

    const payload = Array.isArray(res.data) ? res.data : res.data.results;
    if (!Array.isArray(payload) || payload.length === 0) {
        return null;
    }

    return payload[0] ?? null;
}
