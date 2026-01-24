/*usar para mostar somente a carta, sem informçoes*/ 

import type { Card } from "../../types/Card";
import "./style.css"

type Props = {
    card: Card;
    compact?: boolean;
};

export function CardItem({ card, compact }: Props) {
    return (
        <div className={compact ? "card card--compact" : "card"}>
            <img
                src={card.imagem || undefined}
                alt={card.nome}
            />

            {!compact && (
                <div className="card-info">
                    <strong>{card.nome}</strong>
                    <span>{card.numero_completo}</span>
                </div>
            )}
        </div>
    );
}
