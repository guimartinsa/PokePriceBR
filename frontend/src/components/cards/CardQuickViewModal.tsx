import { useEffect, useMemo, useState } from "react";
//import { Link } from "react-router-dom";
import { AxiosError } from "axios";

import type { CollectionCard } from "../../services/collection";
import { createCollection, fetchCollections, toggleCollectionCard, type Collection } from "../../services/collection";
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

function getHighResolutionImageUrl(card: Card | CollectionCard): string {
    if (card.imagem_grande) return card.imagem_grande;

    if (card.imagem) {
        return card.imagem.replace(/\/low\.webp(\?.*)?$/, "/high.webp$1");
    }

    return "/placeholder.png";
}


export function CardQuickViewModal({
    card,
    open,
    onClose,
    showCollectionActions = false,
}: CardQuickViewModalProps) {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [isSavingToCollection, setIsSavingToCollection] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState("");
    const [showLimitMessage, setShowLimitMessage] = useState(false);

    const hasCollections = collections.length > 0;

    const collectionSelectValue = useMemo(
        () => (selectedCollectionId === null ? "" : String(selectedCollectionId)),
        [selectedCollectionId]
    );

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

    useEffect(() => {
        if (!open || !showCollectionActions) return;

        fetchCollections()
            .then((response) => {
                setCollections(response);

                if (response.length === 0) {
                    setSelectedCollectionId(null);
                    return;
                }

                setSelectedCollectionId((current) => {
                    if (current && response.some((collection) => collection.id === current)) {
                        return current;
                    }

                    return response[0].id;
                });
            })
            .catch((error) => {
                console.error("Erro ao buscar coleções:", error);
                setCollections([]);
                setSelectedCollectionId(null);
            });
    }, [open, showCollectionActions]);

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
                        <img src={getHighResolutionImageUrl(card)} alt={card.nome} loading="eager" />
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
                                <>
                                    <select
                                        value={collectionSelectValue}
                                        onChange={(event) => setSelectedCollectionId(Number(event.target.value))}
                                        disabled={!hasCollections || isSavingToCollection}
                                        className="card-quick-view-secondary-action"
                                    >
                                        {hasCollections ? (
                                            collections.map((collection) => (
                                                <option key={collection.id} value={collection.id}>
                                                    {collection.name}
                                                </option>
                                            ))
                                        ) : (
                                            <option value="">Sem coleções disponíveis</option>
                                        )}
                                    </select>

                                    <button
                                        type="button"
                                        className="card-quick-view-secondary-action"
                                        disabled={!selectedCollectionId || isSavingToCollection}
                                        onClick={async () => {
                                            if (!selectedCollectionId) return;

                                            try {
                                                setIsSavingToCollection(true);
                                                await toggleCollectionCard(selectedCollectionId, card.id, false);
                                            } finally {
                                                setIsSavingToCollection(false);
                                            }
                                        }}
                                    >
                                        {isSavingToCollection ? "Adicionando..." : "Adicionar à coleção"}
                                    </button>
                                    <div style={{ display: "grid", gap: 8, width: "100%" }}>
                                        <input
                                            value={newCollectionName}
                                            onChange={(event) => setNewCollectionName(event.target.value)}
                                            placeholder="Criar coleção e adicionar carta"
                                            className="card-quick-view-secondary-action"
                                            style={{ minWidth: 240 }}
                                        />
                                        <button
                                            type="button"
                                            className="card-quick-view-secondary-action"
                                            disabled={!newCollectionName.trim() || isSavingToCollection}
                                            onClick={async () => {
                                                try {
                                                    setIsSavingToCollection(true);
                                                    const newCollection = await createCollection(newCollectionName.trim());
                                                    await toggleCollectionCard(newCollection.id, card.id, false);
                                                    setCollections((prev) => [...prev, newCollection]);
                                                    setSelectedCollectionId(newCollection.id);
                                                    setNewCollectionName("");
                                                    setShowLimitMessage(false);
                                                } catch (error) {
                                                    if (error instanceof AxiosError && error.response?.status === 403) {
                                                        setShowLimitMessage(true);
                                                    }
                                                } finally {
                                                    setIsSavingToCollection(false);
                                                }
                                            }}
                                        >
                                            Criar coleção
                                        </button>
                                        {showLimitMessage && (
                                            <small style={{ color: "#ffd084" }}>
                                                Limite atingido. Selecione uma coleção existente e clique em “Adicionar à coleção”.
                                            </small>
                                        )}
                                    </div>

                                </>
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
