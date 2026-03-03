import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

import { Loading } from "../../components/Loading";
import { Section } from "../../components/ui/Section";
import { StatBlock } from "../../components/ui/StatBlock";
import { SearchFilters, type SearchFiltersState } from "../../components/filters/Searchfilters";

import {
    fetchCollectionCards,
    toggleCollectionCard,
    atualizarPrecosColecao,
    removeCardFromCollection,
    type CollectionCard,
} from "../../services/collection";
import { CardItemDetail } from "../../components/cards/CardItemDetail";
import { AddCardsPanel } from "./AddCardsPanel";

import { CardQuickViewModal } from "../../components/cards/CardQuickViewModal";
import "./collectionPage.css";

export default function CollectionPage() {
    type BinderLayout = "3x3" | "4x3" | "2x2" | "4x4";

    const { id } = useParams();
    const collectionId = id ? Number(id) : null;

    const [collection, setCollection] = useState<CollectionCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCard, setSelectedCard] = useState<CollectionCard | null>(null);

    const [filters, setFilters] = useState<SearchFiltersState>({
        nome: "",
        set: "",
        raridade: "",
        ilustrador: "",
        over: null,
        preco_min: "",
        preco_max: "",
        ordenar: "",
    });

    const [showAddCardsModal, setShowAddCardsModal] = useState(false);
    const [viewMode, setViewMode] = useState<"grid" | "binder">("grid");
    const [binderLayout, setBinderLayout] = useState<BinderLayout>("3x3");
    const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<string | null>(null);
    const [currentBinderPage, setCurrentBinderPage] = useState(0);

    const toPriceNumber = (value: string | null) => Number.parseFloat(value ?? "0") || 0;

    const filteredCollection = collection.filter((card) => {
        if (filters.nome && !card.nome.toLowerCase().includes(filters.nome.toLowerCase())) return false;
        if (filters.set && card.set?.codigo_liga !== filters.set) return false;
        if (filters.raridade && card.raridade !== filters.raridade) return false;
        if (filters.preco_min && Number(card.preco_med) < Number(filters.preco_min)) return false;
        if (filters.preco_max && Number(card.preco_med) > Number(filters.preco_max)) return false;

        return true;
    });

    const filteredAndSortedCollection = useMemo(() => {
        const cards = [...filteredCollection];

        switch (filters.ordenar) {
            case "nome":
                cards.sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR", { sensitivity: "base" }));
                break;
            case "numero":
                cards.sort((a, b) => (a.numero ?? 0) - (b.numero ?? 0));
                break;
            case "preco":
                cards.sort((a, b) => toPriceNumber(a.preco_med) - toPriceNumber(b.preco_med));
                break;
            case "lancamento":
                cards.sort((a, b) => b.id - a.id);
                break;
            default:
                break;
        }

        return cards;
    }, [filteredCollection, filters.ordenar]);

    const binderLayoutConfig: Record<BinderLayout, { label: string; rows: number; cols: number }> = {
        "3x3": { label: "9 bolsos · 3x3", rows: 3, cols: 3 },
        "4x3": { label: "12 bolsos · 4x3", rows: 4, cols: 3 },
        "2x2": { label: "4 bolsos · 2x2", rows: 2, cols: 2 },
        "4x4": { label: "16 bolsos · 4x4", rows: 4, cols: 4 },
    };

    const activeLayout = binderLayoutConfig[binderLayout];
    const slotsPerPage = activeLayout.rows * activeLayout.cols;
    const cardsPerSpread = slotsPerPage * 2;

    const binderSpreads = useMemo(() => {
        const spreads: Array<{ left: Array<CollectionCard | null>; right: Array<CollectionCard | null> }> = [];

        for (let start = 0; start < filteredAndSortedCollection.length; start += cardsPerSpread) {
            const spreadCards = filteredAndSortedCollection.slice(start, start + cardsPerSpread);
            const left: Array<CollectionCard | null> = spreadCards.slice(0, slotsPerPage);
            const right: Array<CollectionCard | null> = spreadCards.slice(slotsPerPage, cardsPerSpread);
            while (left.length < slotsPerPage) left.push(null);
            while (right.length < slotsPerPage) right.push(null);
            spreads.push({ left, right });
        }

        if (spreads.length === 0) {
            const emptyPage = Array.from({ length: slotsPerPage }, () => null);
            spreads.push({ left: emptyPage, right: [...emptyPage] });
        }

        return spreads;
    }, [filteredAndSortedCollection, cardsPerSpread, slotsPerPage]);

    const totalBinderPages = binderSpreads.length;
    const safeBinderPage = Math.min(currentBinderPage, totalBinderPages - 1);
    const activeSpread = binderSpreads[safeBinderPage];

    const estimatedValue = collection.reduce((sum, card) => sum + toPriceNumber(card.preco_min), 0);
    const currentCollectionValue = collection.reduce(
        (sum, card) => sum + (card.owned ? toPriceNumber(card.preco_min) : 0),
        0,
    );

    useEffect(() => {
        setCurrentBinderPage(0);
    }, [filters, binderLayout]);

    useEffect(() => {
        if (currentBinderPage > totalBinderPages - 1) {
            setCurrentBinderPage(Math.max(totalBinderPages - 1, 0));
        }
    }, [currentBinderPage, totalBinderPages]);

    useEffect(() => {
        if (!collectionId) {
            setLoading(false);
            return;
        }

        loadCollection(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionId]);

    async function loadCollection(showPageLoader = false) {
        if (showPageLoader) {
            setLoading(true);
        }

        try {
            const cards = await fetchCollectionCards(collectionId!);
            setCollection(cards);
        } catch (err) {
            console.error("Erro ao carregar coleção:", err);
        } finally {
            if (showPageLoader) {
                setLoading(false);
            }
        }
    }

    if (loading) return <Loading />;

    if (!collectionId) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <p>Coleção inválida ou não encontrada.</p>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px" }}>
            <h1>Minha Coleção</h1>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3, 1fr)",
                    gap: "16px",
                    margin: "24px 0",
                    padding: "16px",
                    background: "rgba(255,255,255,0.05)",
                    borderRadius: "12px",
                }}
            >
                <StatBlock value={collection.length} label="Total de Cartas" />
                <StatBlock value={`R$ ${estimatedValue.toFixed(2)}`} label="Valor Total da Coleção" />
                <StatBlock value={`R$ ${currentCollectionValue.toFixed(2)}`} label="Valor Atual da Coleção" />
            </div>

            <SearchFilters filters={filters} onChange={setFilters} />

            <div className="collection-view-switcher">
                <span className="collection-view-switcher__title">Modo de visualização</span>
                <div className="collection-view-switcher__modes">
                    <button
                        type="button"
                        className={`collection-view-switcher__button ${viewMode === "grid" ? "is-active" : ""}`}
                        onClick={() => setViewMode("grid")}
                    >
                        Grade
                    </button>
                    <button
                        type="button"
                        className={`collection-view-switcher__button ${viewMode === "binder" ? "is-active" : ""}`}
                        onClick={() => setViewMode("binder")}
                    >
                        Fichário
                    </button>
                </div>

                {viewMode === "binder" && (
                    <div className="collection-view-switcher__layouts">
                        {(Object.keys(binderLayoutConfig) as BinderLayout[]).map((layoutKey) => (
                            <button
                                key={layoutKey}
                                type="button"
                                className={`collection-view-switcher__button ${binderLayout === layoutKey ? "is-active" : ""}`}
                                onClick={() => setBinderLayout(layoutKey)}
                            >
                                {binderLayoutConfig[layoutKey].label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <button
                    onClick={() => setShowAddCardsModal(true)}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "#d61d1d",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    ➕ Adicionar cartas
                </button>

                <button
                    onClick={async () => {
                        try {
                            setIsUpdatingPrices(true);
                            setUpdateMessage(null);
                            const response = await atualizarPrecosColecao(collectionId);
                            setUpdateMessage(response.status);
                        } catch (error) {
                            console.error("Erro ao iniciar atualização de preços:", error);
                            setUpdateMessage("Erro ao iniciar atualização");
                        } finally {
                            setIsUpdatingPrices(false);
                        }
                    }}
                    disabled={isUpdatingPrices}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: isUpdatingPrices ? "#7b8594" : "#1f6feb",
                        color: "#fff",
                        border: "none",
                        cursor: isUpdatingPrices ? "not-allowed" : "pointer",
                    }}
                >
                    {isUpdatingPrices ? "Atualizando..." : "🔄 Atualizar preços"}
                </button>
            </div>

            {updateMessage && <p style={{ marginTop: -8, marginBottom: 16, color: "#c3d1ff" }}>{updateMessage}</p>}

            {showAddCardsModal && (
                <div className="card-quick-view-overlay" onClick={() => setShowAddCardsModal(false)} role="presentation">
                    <div
                        className="card-quick-view-modal add-cards-modal"
                        onClick={(event) => event.stopPropagation()}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="add-cards-modal-title"
                    >
                        <button
                            type="button"
                            className="card-quick-view-close"
                            onClick={() => setShowAddCardsModal(false)}
                            aria-label="Fechar modal"
                        >
                            ✕
                        </button>
                        <h3 id="add-cards-modal-title" style={{ marginBottom: 12 }}>Adicionar cartas</h3>
                        <AddCardsPanel
                            collectionCardIds={collection.map((c) => c.id)}
                            onToggle={async (cardId, shouldAdd) => {
                                if (shouldAdd) {
                                    await toggleCollectionCard(collectionId, cardId, false);
                                } else {
                                    await removeCardFromCollection(collectionId, cardId);
                                }

                                await loadCollection();
                            }}
                        />
                    </div>
                </div>
            )}

            <Section title="Suas Cartas">
                {filteredAndSortedCollection.length === 0 ? (
                    <p style={{ color: "#999" }}>Nenhuma carta corresponde aos filtros.</p>
                ) : viewMode === "binder" ? (
                    <div className="binder-view">
                        <div className="binder-pagination">
                            <button
                                type="button"
                                className="collection-view-switcher__button"
                                onClick={() => setCurrentBinderPage((prev) => Math.max(prev - 1, 0))}
                                disabled={safeBinderPage === 0}
                            >
                                |&lt;-anterior
                            </button>
                            <span className="binder-pagination__label">Página {safeBinderPage + 1}</span>
                            <button
                                type="button"
                                className="collection-view-switcher__button"
                                onClick={() => setCurrentBinderPage((prev) => Math.min(prev + 1, totalBinderPages - 1))}
                                disabled={safeBinderPage >= totalBinderPages - 1}
                            >
                                próxima -&gt;|
                            </button>
                        </div>

                        <article key={safeBinderPage} className="binder-spread">
                            <div className="binder-spread__rings" aria-hidden="true" />
                            <div
                                className="binder-page"
                                style={{
                                    gridTemplateColumns: `repeat(${activeLayout.cols}, minmax(0, 1fr))`,
                                    gridTemplateRows: `repeat(${activeLayout.rows}, minmax(0, 1fr))`,
                                }}
                            >
                                {activeSpread.left.map((card, index) => (
                                    <button
                                        key={`left-${safeBinderPage}-${index}`}
                                        type="button"
                                        className={`binder-pocket ${card ? "has-card" : "is-empty"}`}
                                        onClick={() => card && setSelectedCard(card)}
                                        disabled={!card}
                                    >
                                        {card ? (
                                            <>
                                                <img src={card.imagem || "/placeholder.png"} alt={card.nome} />
                                                <span>{card.nome}</span>
                                            </>
                                        ) : (
                                            <span>Slot vazio</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                            <div
                                className="binder-page"
                                style={{
                                    gridTemplateColumns: `repeat(${activeLayout.cols}, minmax(0, 1fr))`,
                                    gridTemplateRows: `repeat(${activeLayout.rows}, minmax(0, 1fr))`,
                                }}
                            >
                                {activeSpread.right.map((card, index) => (
                                    <button
                                        key={`right-${safeBinderPage}-${index}`}
                                        type="button"
                                        className={`binder-pocket ${card ? "has-card" : "is-empty"}`}
                                        onClick={() => card && setSelectedCard(card)}
                                        disabled={!card}
                                    >
                                        {card ? (
                                            <>
                                                <img src={card.imagem || "/placeholder.png"} alt={card.nome} />
                                                <span>{card.nome}</span>
                                            </>
                                        ) : (
                                            <span>Slot vazio</span>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </article>
                    </div>
                ) : (
                    <div className="card-grid">
                        {filteredAndSortedCollection.map((card) => (
                            <CardItemDetail
                                key={card.id}
                                card={card}
                                onClick={() => setSelectedCard(card)}
                                onToggleOwned={(variation, owned) => {
                                    setCollection((prev) =>
                                        prev.map((c) => {
                                            if (c.id !== card.id) return c;
                                            const fieldMap = {
                                                normal: "owned_normal",
                                                foil: "owned_foil",
                                                reverse_foil: "owned_reverse_foil",
                                                master_ball: "owned_master_ball",
                                                pokeball_foil: "owned_pokeball_foil",
                                            } as const;
                                            const field = fieldMap[variation];
                                            const nextCard = { ...c, [field]: owned };
                                            nextCard.owned = Boolean(
                                                nextCard.owned_normal ||
                                                    nextCard.owned_foil ||
                                                    nextCard.owned_reverse_foil ||
                                                    nextCard.owned_master_ball ||
                                                    nextCard.owned_pokeball_foil,
                                            );
                                            return nextCard;
                                        }),
                                    );

                                    toggleCollectionCard(collectionId, card.id, owned, variation);
                                }}
                            />
                        ))}
                    </div>
                )}
            </Section>

            {selectedCard && (
                <CardQuickViewModal
                    card={selectedCard}
                    open={!!selectedCard}
                    onClose={() => setSelectedCard(null)}
                    showCollectionActions
                />
            )}
        </div>
    );
}
