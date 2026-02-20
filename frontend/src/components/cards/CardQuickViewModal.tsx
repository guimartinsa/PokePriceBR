import { useEffect } from "react";
import { Link } from "react-router-dom";

import type { CollectionCard } from "../../services/collection";
import type { Card } from "../../types/Card";

type CardQuickViewModalProps = {
    card: Card | CollectionCard;
    open: boolean;
    onClose: () => void;
    showCollectionActions?: boolean;
};

function formatPrice(value: string | null | undefined): string {
    if (!value) return "Indisponível";

    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue <= 0) return "Indisponível";

    return `R$ ${numericValue.toFixed(2)}`;
}

export function CardQuickViewModal({
    card,
    open,
    onClose,
    showCollectionActions = false,
}: CardQuickViewModalProps) {
    useEffect(() => {
        if (!open) return;

        const handleEscape = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                onClose();
            }
        };

        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div className="card-quick-view-overlay" onClick={onClose} role="presentation">
            <div
                className="card-quick-view-modal"
                onClick={(event) => event.stopPropagation()}
                role="dialog"
                aria-modal="true"
                aria-labelledby="card-quick-view-title"
            >
                <button type="button" className="card-quick-view-close" onClick={onClose} aria-label="Fechar modal">
                    ✕
                </button>

                <div className="card-quick-view-content">
                    <div className="card-quick-view-media">
                        <img src={card.imagem || "/placeholder.png"} alt={card.nome} />
                        <p>
                            Carta de <strong>{card.set?.nome}</strong>, número <strong>{card.numero_completo}</strong>, com raridade{" "}
                            <strong>{card.raridade || "não informada"}</strong>.
                        </p>
                    </div>

                    <div className="card-quick-view-info">
                        <span className="card-quick-view-tag">Visão rápida</span>
                        <h3 id="card-quick-view-title">{card.nome}</h3>
                        <p className="card-quick-view-subtitle">
                            {card.set?.nome} • Nº {card.numero_completo}
                        </p>

                        <p className="card-quick-view-rarity">Raridade: {card.raridade || "Não informada"}</p>

                        <div className="card-quick-view-price-grid">
                            <div>
                                <small>Preço mínimo</small>
                                <strong>{formatPrice(card.preco_min)}</strong>
                            </div>
                            <div>
                                <small>Preço médio</small>
                                <strong>{formatPrice(card.preco_med)}</strong>
                            </div>
                            <div>
                                <small>Preço máximo</small>
                                <strong>{formatPrice(card.preco_max)}</strong>
                            </div>
                        </div>

                        <div className="card-quick-view-actions">
                            {card.liga_url && (
                                <a href={card.liga_url} target="_blank" rel="noreferrer" className="card-quick-view-primary-action">
                                    Ver na Liga Pokémon
                                </a>
                            )}

                            {showCollectionActions && (
                                <Link to="/collection" className="card-quick-view-secondary-action" onClick={onClose}>
                                    Adicionar à coleção
                                </Link>
                            )}

                            <button type="button" className="card-quick-view-secondary-action" onClick={onClose}>
                                Fechar
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}