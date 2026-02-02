import api from "../api/api";

/* 🔹 Tipos */
export type UserCard = {
    card_id: number;
    owned: boolean;
};

/* 🔹 Buscar itens da coleção (default por enquanto) */
export async function fetchUserCollection(): Promise<UserCard[]> {
    const res = await api.get<UserCard[]>("/collection/");
    return res.data;
}

/* 🔹 Toggle owned (checkbox) */
export async function toggleCollectionCard(
    collectionId: number,
    cardId: number,
    owned: boolean
): Promise<void> {
    await api.post(`/collection/${collectionId}/cards/`, {
        card_id: cardId,
        owned,
    });
}

export type Collection = {
    id: number;
    name: string;
};

export async function fetchCollections(): Promise<Collection[]> {
    const res = await api.get<Collection[]>("/collections/");
    return res.data;
}
