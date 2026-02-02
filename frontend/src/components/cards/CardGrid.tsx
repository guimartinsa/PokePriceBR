import type { Card } from "../../types/Card";
import { CardItemDetail } from "./CardItemDetail";

type Props<T extends Card = Card> = {
    cards: T[];
    compact?: boolean;

    /** 🔥 NOVO (opcional) */
    renderItem?: (card: T) => React.ReactNode;
};

export function CardGrid<T extends Card>({
    cards,
    compact = false,
    renderItem,
}: Props<T>) {
    if (cards.length === 0) {
        return (
            <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                <p>Nenhuma carta encontrada</p>
            </div>
        );
    }

    return (
        <div className="card-grid">
            {cards.map((card) =>
                renderItem ? (
                    renderItem(card)
                ) : (
                    <CardItemDetail
                        key={`${card.id}-${card.set}-${card.numero}`}
                        card={card}
                        compact={compact}
                    />
                )
            )}
        </div>
    );
}
