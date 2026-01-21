import type { Card } from "../../types/Card";
import "./style.css"

type Props = {
    card: Card;
    compact?: boolean;
};

export function CardItem({ card, compact = false }: Props) {
    return (
        <div className={`card-item ${compact ? "compact" : ""}`}>
            <img src={card.imagem || "/placeholder.webp"} alt={card.nome} />
            {!compact && (
                <>
                    <h3>{card.nome}</h3>
                    <span>{card.numero_completo}</span>
                </>
            )}
        </div>
    );
}
