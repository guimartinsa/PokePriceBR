import type { Card } from "../../types/Card";
import { CardItemDetail } from "./CardItemDetail";

type Props<T extends Card> = {
    cards: T[];
    compact?: boolean;
    onCardClick?: (card: T) => void;
};

export function CardGrid<T extends Card>({ cards, compact = false, onCardClick }: Props<T>) {
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
                <CardItemDetail
                    key={card.id}
                    card={card}
                    compact={compact}
                    onClick={onCardClick ? () => onCardClick(card) : undefined}
                />
            ))}
        </div>
    );
}
