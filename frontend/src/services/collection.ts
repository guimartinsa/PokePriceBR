import api from "../api/api";

/* ===============================
   TIPOS
================================ */

export type Collection = {
    id: number;
    name: string;
};

export type CollectionCard = {
    card_id: number;
    owned: boolean;
};

/* ===============================
   COLEÇÕES
================================ */

/* 🔹 Lista coleções do usuário */
export async function fetchCollections(): Promise<Collection[]> {
    const res = await api.get<Collection[]>("/collections/");
    return res.data;
}

/* 🔹 Criar nova coleção */
/* 🔹 Criar coleção */
export async function createCollection(name: string): Promise<Collection> {
    const res = await api.post<Collection>("/collections/", { name });
    return res.data;
}

/* 🔹 Deletar coleção */
export async function deleteCollection(id: number): Promise<void> {
    await api.delete(`/collections/${id}/`);
}

/* ===============================
   CARTAS DA COLEÇÃO
================================ */

/* 🔹 Buscar cartas de UMA coleção */
export async function fetchCollectionCards(
    collectionId: number
): Promise<CollectionCard[]> {
    const res = await api.get<CollectionCard[]>(
        `/collections/${collectionId}/cards/`
    );
    return res.data;
}

/* 🔹 Marcar / desmarcar "Tenho" */
export async function toggleCollectionCard(
    collectionId: number,
    cardId: number,
    owned: boolean
): Promise<void> {
    await api.post(`/collections/${collectionId}/toggle/`, {
        card_id: cardId,
        owned,
    });
}
