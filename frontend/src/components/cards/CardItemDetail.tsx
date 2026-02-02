import type { Card } from "../../types/Card";
import "./style.css";

type Props = {
    card: Card;
    compact?: boolean;

    /** coleção */
    owned?: boolean;
    onToggleOwned?: (value: boolean) => void;
};

export function CardItemDetail({
    card,
    compact = false,
    owned = false,
    onToggleOwned,
}: Props) {
    return (
        <div className={`card-item ${compact ? "compact" : ""}`}>
            <img
                src={card.imagem || "/placeholder.png"}
                alt={card.nome}
            />

            <div className="card-body">
                <strong>{card.nome}</strong>
                <small>({card.numero_completo})</small>
                <br />
                <small>{card.set.nome}</small>

                {card.preco_med && (
                    <div className="price">
                        R$ {card.preco_med}
                    </div>
                )}

                {/* ✅ CHECKBOX APENAS QUANDO NÃO FOR COMPACT */}
                {!compact && (
                    <label className="owned-checkbox">
                        <input
                            type="checkbox"
                            checked={owned}
                            onChange={(e) =>
                                onToggleOwned?.(e.target.checked)
                            }
                        />
                        <span>Tenho</span>
                    </label>
                )}
            </div>
        </div>
    );
}
