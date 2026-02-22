import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchCards } from "../api/cards";
import { fetchSeries } from "../api/series";
import { CardItemDetail } from "../components/cards/CardItemDetail";
import { SearchFilters, type SearchFiltersState } from "../components/filters/Searchfilters";
import { Loading } from "../components/Loading";
import {
    fetchCollectionCards,
    fetchCollections,
    toggleCollectionCard,
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
});

export default function SetPage() {
    const { setCode = "" } = useParams<{ setCode: string }>();
    const navigate = useNavigate();

    const [filters, setFilters] = useState<SearchFiltersState>(createDefaultFilters(setCode));
    const [cards, setCards] = useState<(Card & { owned?: boolean })[]>([]);
    const [loadingCards, setLoadingCards] = useState(false);

    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [ownedCardIds, setOwnedCardIds] = useState<Set<number>>(new Set());

    const [setName, setSetName] = useState<string>(setCode);

    useEffect(() => {
        setFilters(createDefaultFilters(setCode));
        setSetName(setCode);

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
            setOwnedCardIds(new Set());
            return;
        }

        fetchCollectionCards(selectedCollectionId)
            .then((collectionCards) => {
                const nextOwned = new Set(
                    collectionCards.filter((item) => item.owned).map((item) => item.id),
                );
                setOwnedCardIds(nextOwned);
            })
            .catch(() => setOwnedCardIds(new Set()));
    }, [selectedCollectionId]);

    useEffect(() => {
        if (!setCode) {
            setCards([]);
            return;
        }

        setLoadingCards(true);
        fetchCards({
            page: 1,
            set: setCode,
            nome: filters.nome || undefined,
            raridade: filters.raridade || undefined,
            ilustrador: filters.ilustrador || undefined,
            over: filters.over !== null ? filters.over : undefined,
            preco_min: filters.preco_min || undefined,
            preco_max: filters.preco_max || undefined,
        })
            .then((data) => {
                setCards(
                    data.results.map((card) => ({
                        ...card,
                        owned: ownedCardIds.has(card.id),
                    })),
                );
            })
            .finally(() => setLoadingCards(false));
    }, [setCode, filters.nome, filters.raridade, filters.ilustrador, filters.over, filters.preco_min, filters.preco_max, ownedCardIds]);

    const safeFilters = useMemo(
        () => ({
            ...filters,
            set: setCode,
        }),
        [filters, setCode],
    );

    const handleToggleOwned = (cardId: number, owned: boolean) => {
        if (!selectedCollectionId) return;

        setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, owned } : card)));
        setOwnedCardIds((prev) => {
            const next = new Set(prev);
            if (owned) {
                next.add(cardId);
            } else {
                next.delete(cardId);
            }
            return next;
        });

        toggleCollectionCard(selectedCollectionId, cardId, owned).catch(() => {
            setCards((prev) => prev.map((card) => (card.id === cardId ? { ...card, owned: !owned } : card)));
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

            {loadingCards ? (
                <Loading />
            ) : cards.length === 0 ? (
                <p>Nenhuma carta encontrada.</p>
            ) : (
                <div className="card-grid">
                    {cards.map((card) => (
                        <CardItemDetail
                            key={card.id}
                            card={card}
                            onToggleOwned={selectedCollectionId ? (owned) => handleToggleOwned(card.id, owned) : undefined}
                        />
                    ))}
                </div>
            )}
        </main>
    );
}
