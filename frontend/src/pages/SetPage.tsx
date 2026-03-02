import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchCards } from "../api/cards";
import { fetchSeries } from "../api/series";
import { CardItemDetail } from "../components/cards/CardItemDetail";
import { SearchFilters, type SearchFiltersState } from "../components/filters/Searchfilters";
import { CardQuickViewModal } from "../components/cards/CardQuickViewModal";
import { Loading } from "../components/Loading";
import {
    fetchCollectionCards,
    fetchCollections,
    toggleCollectionCard,
    type CardVariation,
    type Collection,
} from "../services/collection";
import type { Card } from "../types/Card";

const createDefaultFilters = (setCode: string): SearchFiltersState => ({
    nome: "",
    set: setCode,
    raridade: "",
    ilustrador: "",
    over: null,
    preco_min: "",
    preco_max: "",
    ordenar: "",
});

type OwnedVariationState = Pick<Card, "owned" | "owned_normal" | "owned_foil" | "owned_reverse_foil" | "owned_master_ball" | "owned_pokeball_foil">;

const variationFieldMap: Record<CardVariation, keyof OwnedVariationState> = {
    normal: "owned_normal",
    foil: "owned_foil",
    reverse_foil: "owned_reverse_foil",
    master_ball: "owned_master_ball",
    pokeball_foil: "owned_pokeball_foil",
};

export default function SetPage() {
    const { setCode = "" } = useParams<{ setCode: string }>();
    const navigate = useNavigate();

    const [filters, setFilters] = useState<SearchFiltersState>(createDefaultFilters(setCode));
    const [cards, setCards] = useState<Card[]>([]);
    const [loadingCards, setLoadingCards] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [ownedByCardId, setOwnedByCardId] = useState<Record<number, OwnedVariationState>>({});

    const [setName, setSetName] = useState<string>(setCode);
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);

    const isInitialLoading = loadingCards && page === 1;

    useEffect(() => {
        setFilters(createDefaultFilters(setCode));
        setSetName(setCode);
        setPage(1);
        setHasMore(true);
        setCards([]);

        fetchSeries().then((series) => {
            const selectedSet = series
                .flatMap((serie) => serie.sets)
                .find((setItem) => setItem.codigo_liga === setCode);

            if (selectedSet?.nome) {
                setSetName(selectedSet.nome);
            }
        });
    }, [setCode]);

    useEffect(() => {
        fetchCollections()
            .then((items) => {
                setCollections(items);
                if (items.length > 0) {
                    setSelectedCollectionId(items[0].id);
                }
            })
            .catch(() => setCollections([]));
    }, []);

    useEffect(() => {
        if (!selectedCollectionId) {
            setOwnedByCardId({});
            return;
        }

        fetchCollectionCards(selectedCollectionId)
            .then((collectionCards) => {
                const nextOwned = Object.fromEntries(
                    collectionCards.map((item) => [item.id, {
                        owned: item.owned,
                        owned_normal: item.owned_normal,
                        owned_foil: item.owned_foil,
                        owned_reverse_foil: item.owned_reverse_foil,
                        owned_master_ball: item.owned_master_ball,
                        owned_pokeball_foil: item.owned_pokeball_foil,
                    }]),
                );
                setOwnedByCardId(nextOwned);
            })
            .catch(() => setOwnedByCardId({}));
    }, [selectedCollectionId]);

    useEffect(() => {
        setCards((prev) => prev.map((card) => ({ ...card, ...(ownedByCardId[card.id] ?? {}) })));
    }, [ownedByCardId]);

    useEffect(() => {
        setPage(1);
        setHasMore(true);
    }, [setCode, filters.nome, filters.raridade, filters.ilustrador, filters.over, filters.preco_min, filters.preco_max, filters.ordenar]);

    useEffect(() => {
        if (!setCode) {
            setCards([]);
            return;
        }

        setLoadingCards(true);
        fetchCards({
            page,
            set: setCode,
            nome: filters.nome || undefined,
            raridade: filters.raridade || undefined,
            ilustrador: filters.ilustrador || undefined,
            over: filters.over !== null ? filters.over : undefined,
            preco_min: filters.preco_min || undefined,
            preco_max: filters.preco_max || undefined,
            ordenar: filters.ordenar || undefined,
        })
            .then((data) => {
                const nextCards = data.results.map((card) => ({
                    ...card,
                    ...(ownedByCardId[card.id] ?? {}),
                }));

                setCards((prev) => (page === 1 ? nextCards : [...prev, ...nextCards]));
                setHasMore(Boolean(data.next));
            })
            .finally(() => setLoadingCards(false));
    }, [setCode, page, filters.nome, filters.raridade, filters.ilustrador, filters.over, filters.preco_min, filters.preco_max, filters.ordenar, ownedByCardId]);

    const safeFilters = useMemo(
        () => ({
            ...filters,
            set: setCode,
        }),
        [filters, setCode],
    );

    const handleToggleOwned = (cardId: number, variation: CardVariation, owned: boolean) => {
        if (!selectedCollectionId) return;

        const field = variationFieldMap[variation];
        setCards((prev) => prev.map((card) => {
            if (card.id !== cardId) return card;

            const nextCard = { ...card, [field]: owned };
            nextCard.owned = Boolean(nextCard.owned_normal || nextCard.owned_foil || nextCard.owned_reverse_foil || nextCard.owned_master_ball || nextCard.owned_pokeball_foil);
            return nextCard;
        }));

        setOwnedByCardId((prev) => {
            const current = prev[cardId] ?? {};
            const next = { ...current, [field]: owned } as OwnedVariationState;
            next.owned = Boolean(next.owned_normal || next.owned_foil || next.owned_reverse_foil || next.owned_master_ball || next.owned_pokeball_foil);
            return { ...prev, [cardId]: next };
        });

        toggleCollectionCard(selectedCollectionId, cardId, owned, variation).catch(() => {
            setCards((prev) => prev.map((card) => {
                if (card.id !== cardId) return card;
                const revertedCard = { ...card, [field]: !owned };
                revertedCard.owned = Boolean(revertedCard.owned_normal || revertedCard.owned_foil || revertedCard.owned_reverse_foil || revertedCard.owned_master_ball || revertedCard.owned_pokeball_foil);
                return revertedCard;
            }));
        });
    };

    if (!setCode) {
        return (
            <main style={{ padding: 16 }}>
                <p>Set invalido.</p>
            </main>
        );
    }

    return (
        <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
            <button
                type="button"
                onClick={() => navigate("/series")}
                style={{ marginBottom: 12, background: "transparent", border: "1px solid #2c3440", color: "inherit", borderRadius: 8, padding: "8px 10px", cursor: "pointer" }}
            >
                Voltar para series
            </button>

            <h1>
                Set: {setName}
                {setCode ? ` (${setCode})` : ""}
            </h1>

            {collections.length > 0 ? (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    Colecao para marcar cartas:
                    <select
                        value={selectedCollectionId ?? ""}
                        onChange={(event) => setSelectedCollectionId(Number(event.target.value))}
                    >
                        {collections.map((collection) => (
                            <option key={collection.id} value={collection.id}>
                                {collection.name}
                            </option>
                        ))}
                    </select>
                </label>
            ) : (
                <p style={{ color: "#f4c26b", marginBottom: 16 }}>
                    Crie uma colecao para poder marcar se voce tem ou nao cada carta.
                </p>
            )}

            <SearchFilters
                filters={safeFilters}
                onChange={(nextFilters) =>
                    setFilters({
                        ...nextFilters,
                        set: setCode,
                    })
                }
            />

            {isInitialLoading ? (
                <Loading />
            ) : cards.length === 0 ? (
                <p>Nenhuma carta encontrada.</p>
            ) : (
                <>
                    <div className="card-grid">
                        {cards.map((card) => (
                            <CardItemDetail
                                key={card.id}
                                card={card}
                                onClick={() => setSelectedCard(card)}
                                onToggleOwned={selectedCollectionId ? (variation, owned) => handleToggleOwned(card.id, variation, owned) : undefined}
                            />
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => setPage((prev) => prev + 1)}
                            disabled={loadingCards}
                            style={{
                                margin: "20px auto 0",
                                display: "block",
                                borderRadius: 10,
                                border: "1px solid #2c3440",
                                background: "#151a21",
                                color: "inherit",
                                padding: "10px 14px",
                                cursor: loadingCards ? "not-allowed" : "pointer",
                            }}
                        >
                            {loadingCards ? "Carregando..." : "Carregar mais"}
                        </button>
                    )}
                </>
            )}

            {selectedCard && (
                <CardQuickViewModal
                    card={selectedCard}
                    open={!!selectedCard}
                    onClose={() => setSelectedCard(null)}
                    showCollectionActions
                />
            )}
        </main>
    );
}
