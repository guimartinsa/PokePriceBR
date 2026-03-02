import api from "../api/api";
import type {Card} from "../types/Card"



/* ===============================
   TIPOS
================================ */

export type Collection = {
    id: number;
    name: string;
    cover_card_id?: number | null;
    cover_image?: string | null;
};

export type CollectionCard = Card &{

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
export async function createCollection(
    name: string,
    coverCardId?: number | null,
): Promise<Collection> {
    const res = await api.post<Collection>("/collections/", {
        name,
        cover_card_id: coverCardId ?? null,
    });
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
export type CardVariation = "normal" | "foil" | "reverse_foil" | "master_ball" | "pokeball_foil";

export async function toggleCollectionCard(
    collectionId: number,
    cardId: number,
    owned: boolean,
    variation?: CardVariation
): Promise<void> {
    await api.post(`/collections/${collectionId}/toggle/`, {
        card_id: cardId,
        owned,
        variation,
    });
}

export async function addCardToCollection(
    collectionId: number,
    cardId: number
): Promise<void> {
    await api.post(`/collections/${collectionId}/cards/`, {
        card_id: cardId,
        owned: false,
    });
}

export async function removeCardFromCollection(
    collectionId: number,
    cardId: number
): Promise<void> {
    await api.delete(`/collections/${collectionId}/cards/${cardId}/`);
}

export async function atualizarPrecosColecao(collectionId: number): Promise<{ status: string }> {
    const res = await api.post<{ status: string }>(
        `/collections/${collectionId}/atualizar-precos/`
    );
    return res.data;
}