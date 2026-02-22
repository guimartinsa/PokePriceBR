import { useEffect, useMemo, useState } from "react";

import { fetchCards } from "../api/cards";
import { fetchSeries, type SeriesItem } from "../api/series";
import { CardItemDetail } from "../components/cards/CardItemDetail";
import { SearchFilters, type SearchFiltersState } from "../components/filters/Searchfilters";
import { Loading } from "../components/Loading";
import { fetchCollectionCards, fetchCollections, toggleCollectionCard, type Collection } from "../services/collection";
import type { Card } from "../types/Card";

const defaultFilters: SearchFiltersState = {
    nome: "",
    set: "",
    raridade: "",
    ilustrador: "",
    over: null,
    preco_min: "",
    preco_max: "",
};

export default function SeriesPage() {
    const [series, setSeries] = useState<SeriesItem[]>([]);
    const [loadingSeries, setLoadingSeries] = useState(true);

    const [expandedSeriesId, setExpandedSeriesId] = useState<number | null>(null);
    const [selectedSetCode, setSelectedSetCode] = useState<string | null>(null);

    const [filters, setFilters] = useState<SearchFiltersState>(defaultFilters);
    const [cards, setCards] = useState<(Card & { owned?: boolean })[]>([]);
    const [loadingCards, setLoadingCards] = useState(false);

    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [ownedCardIds, setOwnedCardIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        fetchSeries()
            .then(setSeries)
            .finally(() => setLoadingSeries(false));

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
        if (!selectedSetCode) {
            setCards([]);
            return;
        }

        setLoadingCards(true);
        fetchCards({
            page: 1,
            set: selectedSetCode,
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
    }, [selectedSetCode, filters, ownedCardIds]);

    const selectedSet = useMemo(() => {
        return series
            .flatMap((serie) => serie.sets)
            .find((setItem) => setItem.codigo_liga === selectedSetCode);
    }, [selectedSetCode, series]);

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

    if (loadingSeries) return <p style={{ padding: 16 }}>Carregando séries...</p>;

    return (
        <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
            <h1>Séries</h1>

            {collections.length > 0 ? (
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    Coleção para marcar cartas:
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
                    Crie uma coleção para poder marcar se você tem ou não cada carta.
                </p>
            )}

            {series.map((serie) => {
                const isExpanded = expandedSeriesId === serie.id;

                return (
                    <section key={serie.id} style={{ marginBottom: 14, border: "1px solid #2c3440", borderRadius: 12 }}>
                        <button
                            type="button"
                            onClick={() => setExpandedSeriesId(isExpanded ? null : serie.id)}
                            style={{
                                width: "100%",
                                background: "transparent",
                                color: "inherit",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 14px",
                                cursor: "pointer",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {serie.logo ? <img src={serie.logo} alt={`Logo da série ${serie.nome}`} style={{ height: 30 }} /> : null}
                                <strong>{serie.nome}</strong>
                            </span>
                            <span>{isExpanded ? "▲" : "▼"}</span>
                        </button>

                        {isExpanded && (
                            <div style={{ padding: "0 14px 14px", display: "grid", gap: 8 }}>
                                {serie.sets.map((setItem) => {
                                    const selected = selectedSetCode === setItem.codigo_liga;
                                    return (
                                        <button
                                            key={setItem.id}
                                            type="button"
                                            onClick={() => {
                                                setSelectedSetCode(setItem.codigo_liga);
                                                setFilters({ ...defaultFilters, set: setItem.codigo_liga ?? "" });
                                            }}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                width: "100%",
                                                textAlign: "left",
                                                borderRadius: 10,
                                                border: selected ? "1px solid #4f8cff" : "1px solid #2c3440",
                                                background: selected ? "#1f2b3a" : "#151a21",
                                                color: "inherit",
                                                padding: "10px",
                                                cursor: "pointer",
                                            }}
                                        >
                                            {setItem.logo ? <img src={setItem.logo} alt={`Logo do set ${setItem.nome}`} style={{ height: 24 }} /> : null}
                                            <span>
                                                {setItem.nome}
                                                {setItem.codigo_liga ? ` (${setItem.codigo_liga})` : ""}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
            })}

            {selectedSetCode && (
                <section style={{ marginTop: 24 }}>
                    <h2>
                        Cartas da coleção: {selectedSet?.nome || selectedSetCode}
                    </h2>
                    <SearchFilters filters={filters} onChange={setFilters} />

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
                </section>
            )}
        </main>
    );
}
