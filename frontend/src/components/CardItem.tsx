import type { Card } from "../types/Card";
import './style.css'


type Props = {
    card: Card;
    compact?: boolean;
};


export function CardItem({ card, compact = false }: Props) {
    return (
        <div className={`card-item ${compact ? "compact" : ""}`}> 
            <img
                src={card.imagem || "/placeholder.png"}
                alt={card.nome}
            />
            <hr></hr>
            <div className="card-body">
                <strong>{card.nome}</strong>
                <small>({card.numero_completo})</small><br></br>
                <small>{card.set.nome}</small>

                {card.preco_med && (
                <div className="price">
                    R$ {card.preco_med}
                </div>
                )}
            </div>
        </div>
    );
}
