import type { Card } from "../../types/Card";
import { CardItem } from "./CardItemDetail";

type Props = {
    cards: Card[];
    compact?: boolean;
};

export function CardGrid({ cards, compact = false }: Props) {
    if (cards.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                <p>Nenhuma carta encontrada</p>
            </div>
        );
    }

    return (
        <div className="card-grid">
            {cards.map((card) => (
                <CardItem key={card.id} card={card} compact={compact} />
            ))}
        </div>
    );
}