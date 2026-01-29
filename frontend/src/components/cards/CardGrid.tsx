import type { Card } from "../../types/Card";
import { CardItem } from "./CardItemDetail";

type Props = {
    cards: Card[];
    compact?: boolean;
};

export function CardGrid({ cards, compact }: Props) {
    return (
        <div className="card-grid">
            {cards.map((card) => (
                <CardItem key={card.id} card={card} compact={compact} />
            ))}
        </div>
    );
}