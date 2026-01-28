import type { Card } from "../../types/Card";
import './style.css'


type Props = {
    card: Card;
    compact?: boolean;
};


export function CardItem({ card, compact = false }: Props) {
    const [owned, setOwned] = useState(() => {
        return localStorage.getItem(`owned-${card.id}`) === "1";
    });

    function toggleOwned() {
        const next = !owned;
        setOwned(next);
        localStorage.setItem(`owned-${card.id}`, next ? "1" : "0");
    }

    return (
        <div className={`card-item ${compact ? "compact" : ""}`}>
            <img
                src={card.imagem || "/placeholder.png"}
                alt={card.nome}
            />
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
