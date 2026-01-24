import { useEffect, useState } from "react";
import { fetchCards } from "../../api/cards";
import type { Card } from "../../types/Card";
//import { CardItem } from "../../components/cards/CardItem";
import { CardItem } from "../../components/CardItem";

import "./home.css";

export function RecentCards() {
    const [cards, setCards] = useState<Card[]>([]);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        setLoading(true);

        fetchCards({ page })
            .then((data) => {
                setCards((prev) =>
                    page === 1 ? data.results : [...prev, ...data.results]
                );
                setHasMore(Boolean(data.next));
            })
            .finally(() => setLoading(false));
    }, [page]);

    return (
        <section className="recent-cards">
            <h2>Cartas Recentes</h2>

            <div className="recent-cards-grid">
                {cards.map((card) => (
                    <CardItem key={card.id} card={card} compact />
                ))}
            </div>

            {hasMore && (
                <button
                    className="load-more"
                    onClick={() => setPage((p) => p + 1)}
                    disabled={loading}
                >
                    {loading ? "Carregando..." : "Carregar mais"}
                </button>
            )}
        </section>
    );
}
