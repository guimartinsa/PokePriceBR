import type { Card } from "../../types/Card";
import "./style.css";

type Props = {
    card: Card & { owned?: boolean };
    compact?: boolean;
    showOwnedToggle?: boolean;

    /** usado na CollectionPage */
    onClick?: () => void;
    onToggleOwned?: (value: boolean) => void;
};

export function CardItemDetail({
    card,
    compact = false,
    onClick,
    onToggleOwned,

}: Props) {

    return (
        <div
            className={`card-item ${compact ? "compact" : ""} ${onClick ? "is-clickable" : ""}`}
            onClick={onClick}
            role={onClick ? "button" : undefined}
            tabIndex={onClick ? 0 : undefined}
            onKeyDown={(e) => {
                if (onClick && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onClick();
                }
            }}
        >
            <img src={card.imagem || "/placeholder.png"} alt={card.nome} />

            <div className="card-body">
                <strong>{card.nome}</strong>
                <small>{card.numero_completo}</small>

                {card.preco_min && <p className="price-min">Menor valor: R$ {card.preco_min}</p>}

                {!compact && (
                    //<label className="owned-checkbox">
                    <label className="owned-checkbox" onClick={(e) => e.stopPropagation()}>
                        <input
                            type="checkbox"
                            checked={!!card.owned}
                            onChange={(e) => onToggleOwned?.(e.target.checked)}
                        />
                        <span>Normal</span>
                    </label>
                )}
            </div>
        </div>
    );
}