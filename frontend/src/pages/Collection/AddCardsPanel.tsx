import { useEffect, useMemo, useState } from "react";
import { fetchCards } from "../../api/cards";
import type { Card } from "../../types/Card";
import { SearchFilters, type SearchFiltersState } from "../../components/filters/Searchfilters";
import "./addCardsPanel.css";
import CheckballIcon from "../../assets/icons/checkball-icon.svg";


type Props = {
    collectionCardIds: number[];
    onToggle(cardId: number, shouldAdd: boolean): Promise<void> | void;
};

export function AddCardsPanel({ collectionCardIds, onToggle }: Props) {
    const [cards, setCards] = useState<Card[]>([]);
    const [page, setPage] = useState(1);

    const [hasMore, setHasMore] = useState(false);
    const [loading, setLoading] = useState(false);
    const [addedCardIds, setAddedCardIds] = useState<number[]>(collectionCardIds);

    const [filters, setFilters] = useState<SearchFiltersState>({
        nome: "",
        set: "",
        raridade: "",
        ilustrador: "",
        over: null,
        preco_min: "",
        preco_max: "",
    });

    useEffect(() => {
        setAddedCardIds(collectionCardIds);
    }, [collectionCardIds]);

    useEffect(() => {
        setPage(1);
    }, [filters]);

    useEffect(() => {
        setLoading(true);

        fetchCards({
            page,
            nome: filters.nome || undefined,
            set: filters.set || undefined,
            raridade: filters.raridade || undefined,
            ilustrador: filters.ilustrador || undefined,
            over: filters.over ?? undefined, // 🔥 AQUI É A CORREÇÃO
            preco_min: filters.preco_min || undefined,
            preco_max: filters.preco_max || undefined,
        })
            .then((data) => {
                setCards(data.results);
                setHasMore(Boolean(data.next));
            })
            .finally(() => setLoading(false));
    }, [filters, page]);

    const addedSet = useMemo(() => new Set(addedCardIds), [addedCardIds]);

    return (
        <div className="add-cards-panel">
            <div className="add-cards-filters">
                <SearchFilters filters={filters} onChange={setFilters} />
            </div>

            <div className="add-cards-toolbar">
                <span>Página {page}</span>
                <div>
                    <button
                        type="button"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={page === 1 || loading}
                    >
                        ← Anterior
                    </button>
                    <button type="button" onClick={() => setPage((prev) => prev + 1)} disabled={!hasMore || loading}>
                        Próxima →
                    </button>
                </div>
            </div>

            <div className="add-cards-grid-wrapper">
                <div className="add-cards-grid">
                    {cards.map((card) => {
                        const added = addedSet.has(card.id);

                        return (
                            <button
                                key={card.id}
                                className={`add-card ${added ? "added" : ""}`}
                                onClick={async () => {
                                    const shouldAdd = !added;

                                    setAddedCardIds((prev) => {
                                        if (shouldAdd) {
                                            if (prev.includes(card.id)) return prev;
                                            return [...prev, card.id];
                                        }

                                        return prev.filter((id) => id !== card.id);
                                    });

                                    await onToggle(card.id, shouldAdd);
                                }}
                            >
                                <img src={card.imagem || "/placeholder.png"} alt={card.nome} />
                                {added && (
                                    <div className="check-overlay">
                                        <img src={CheckballIcon} alt="Carta adicionada" width={65} height={65} />
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
