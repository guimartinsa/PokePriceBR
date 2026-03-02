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
    { key: "possui_normal", shortLabel: "N", label: "Normal", className: "variation-normal" },
    { key: "possui_foil", shortLabel: "F", label: "Foil", className: "variation-foil" },
    { key: "possui_reverse_foil", shortLabel: "RF", label: "Reverse Foil", className: "variation-reverse" },
    { key: "possui_master_ball", shortLabel: "MB", label: "Master Ball", className: "variation-master" },
    { key: "possui_pokeball_foil", shortLabel: "PB", label: "Poké Ball Foil", className: "variation-pokeball" },
] as const;

function isOverSetNumber(numeroCompleto: string): boolean {
    const [cardNumber, totalSet] = numeroCompleto.split("/").map((value) => Number(value));

    return Number.isFinite(cardNumber)
        && Number.isFinite(totalSet)
        && cardNumber > totalSet;
}

function isExCard(cardName: string): boolean {
    return /\bex\b/i.test(cardName);
}

export function CardItemDetail({
    card,
    compact = false,
    onClick,
    onToggleOwned,

}: Props) {
    const lowestPrice = getLowestPrice(card);

    const forceFoilOnly = isExCard(card.nome) || isOverSetNumber(card.numero_completo);
    const availableVariations = forceFoilOnly
        ? [variationLabels[1]]
        : variationLabels.filter((variation) => Boolean(card[variation.key]));


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



                {!compact && availableVariations.length > 0 && (
                    <div className="owned-variations" aria-label="Variações disponíveis">
                        {availableVariations.map((variation) => (
                            <label
                                key={variation.key}
                                className="owned-checkbox"
                                onClick={(e) => e.stopPropagation()}
                                title={variation.label}
                            >
                                <input
                                    type="checkbox"
                                    checked={!!card.owned}
                                    onChange={(e) => onToggleOwned?.(e.target.checked)}
                                />
                                <span className={`variation-marker ${variation.className}`}>
                                    {variation.shortLabel}
                                </span>
                            </label>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}