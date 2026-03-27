import { api } from "./api";
import type { Card } from "../types/Card";

export type ArtistGroup = {
    artist: string;
    total_cards: number;
    oldest_card: Card;
    cards: Card[];
};

export async function fetchArtists(search?: string): Promise<ArtistGroup[]> {
    const res = await api.get<ArtistGroup[]>("/artists/", {
        params: search ? { search } : undefined,
    });

    return Array.isArray(res.data) ? res.data : [];
}
