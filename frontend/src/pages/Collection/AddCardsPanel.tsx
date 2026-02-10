import { useEffect, useState } from "react";
import { fetchCards } from "../../api/cards";
import type { Card } from "../../types/Card";
import { SearchFilters, type SearchFiltersState } from "../../components/filters/Searchfilters";
import "./addCardsPanel.css";
import CheckballIcon from "../../assets/icons/checkball-icon.svg"

type Props = {
    collectionCardIds: number[];
    onAdd(cardId: number): void;
};

export function AddCardsPanel({ collectionCardIds, onAdd }: Props) {
    const [cards, setCards] = useState<Card[]>([]);
    const [page, setPage] = useState(1);
    setPage

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
        fetchCards({ 
            page,
            nome: filters.nome || undefined,
            set: filters.set || undefined,
            raridade: filters.raridade || undefined,
            ilustrador: filters.ilustrador || undefined,
            over: filters.over ?? undefined, // 🔥 AQUI É A CORREÇÃO
            preco_min: filters.preco_min || undefined,
            preco_max: filters.preco_max || undefined,
        }).then((data) => {
            setCards(data.results);
        });
    }, [filters, page]);

    return (
        <div>
            <SearchFilters filters={filters} onChange={setFilters} />

            <div className="add-cards-grid">
                {cards.map((card) => {
                    const added = collectionCardIds.includes(card.id);

                    return (
                        <div
                            key={card.id}
                            className={`add-card ${added ? "added" : ""}`}
                            onClick={() => onAdd(card.id)}
                        >
                            <img src={card.imagem || "/placeholder.png"} />

                            {added && (
                                <div className="check-overlay">
                                    <img src= {CheckballIcon} alt="" width={65} height={65} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
