import { useEffect, useState } from "react";
import { fetchCards } from "../../api/cards";
import type { Card } from "../../types/Card";
import { CardItem } from "../../components/CardItem";

export function RecentCards() {
    const [cards, setCards] = useState<Card[]>([]);

    useEffect(() => {
        fetchCards({ page: 1 })
            .then((data) => setCards(data.results.slice(0, 10)))
            .catch(() => setCards([]));
    }, []);

    return (
        <section className="recent-cards">
            <header>
                <h2>Recent Cards</h2>
                <a href="/cards">View All</a>
            </header>

            <div className="cards-row">
                {cards.map((c) => (
                    <CardItem key={c.id} card={c} compact />
                ))}
            </div>
        </section>
    );
}
