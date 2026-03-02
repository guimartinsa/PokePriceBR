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

function getLowestPrice(card: Pick<Card, "preco_min" | "preco_med" | "preco_max">): string | null {
    const values = [card.preco_min, card.preco_med, card.preco_max]
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);

    if (values.length === 0) return null;
    return Math.min(...values).toFixed(2);
}

const variationLabels = [
    { key: "possui_normal", label: "N", className: "variation-normal" },
    { key: "possui_foil", label: "F", className: "variation-foil" },
    { key: "possui_reverse_foil", label: "RF", className: "variation-reverse" },
    { key: "possui_master_ball", label: "MB", className: "variation-master" },
    { key: "possui_pokeball_foil", label: "PB", className: "variation-pokeball" },
] as const;

export function CardItemDetail({
    card,
    compact = false,
    onClick,
    onToggleOwned,

}: Props) {
    const lowestPrice = getLowestPrice(card);
    const availableVariations = variationLabels.filter((variation) => Boolean(card[variation.key]));

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
                <p className="price-min">
                    Menor valor: {lowestPrice ? `R$ ${lowestPrice}` : "Indisponível"}
                </p>

                {card.preco_min && <p className="price-min">Menor valor: R$ {card.preco_min}</p>}

                {!compact && (
                    <>
                        {availableVariations.length > 0 && (
                            <div className="variations-markers" aria-label="Variações disponíveis">
                                {availableVariations.map((variation) => (
                                    <span
                                        key={variation.key}
                                        className={`variation-marker ${variation.className}`}
                                        title={variation.label}
                                    >
                                        {variation.label}
                                    </span>
                                ))}
                            </div>
                        )}

                        <label className="owned-checkbox" onClick={(e) => e.stopPropagation()}>
                            <input
                                type="checkbox"
                                checked={!!card.owned}
                                onChange={(e) => onToggleOwned?.(e.target.checked)}
                            />
                            <span>Tenho</span>
                        </label>
                    </>
                )}
            </div>
        </div>
    );
}