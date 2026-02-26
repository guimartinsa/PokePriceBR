import { useEffect, useState } from "react";
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

/* 🔹 Tipo local: carta + owned */
/*type CardWithOwned = Card & {owned: boolean;};*/



export default function CollectionPage() {
    /* 🔹 Params */
    const { id } = useParams();
    const collectionId = id ? Number(id) : null;

    /* 🔹 State */
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
    });

    const filteredCollection = collection.filter((card) => {
        if (filters.nome && !card.nome.toLowerCase().includes(filters.nome.toLowerCase())) return false;
        if (filters.set && card.set?.codigo_liga !== filters.set) return false;
        if (filters.raridade && card.raridade !== filters.raridade) return false;
        if (filters.preco_min && Number(card.preco_med) < Number(filters.preco_min)) return false;
        if (filters.preco_max && Number(card.preco_med) > Number(filters.preco_max)) return false;

        return true;
    });

    const [showAddCardsModal, setShowAddCardsModal] = useState(false);
    const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<string | null>(null);

    const toPriceNumber = (value: string | null) => Number.parseFloat(value ?? "0") || 0;

    const uniqueCards = new Set(collection.map((card) => card.id)).size;
    const estimatedValue = collection.reduce((sum, card) => sum + toPriceNumber(card.preco_min), 0);
    const currentCollectionValue = collection.reduce(
        (sum, card) => sum + (card.owned ? toPriceNumber(card.preco_min) : 0),
        0,
    );

    /* 🔹 Effect */
    useEffect(() => {
        if (!collectionId) {
            setLoading(false);
            return;
        }

        loadCollection(true);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionId]);

    /* 🔹 Load */
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


    /* 🔹 Early returns */
    if (loading) return <Loading />;

    if (!collectionId) {
        return (
            <div style={{ padding: "40px", textAlign: "center" }}>
                <p>Coleção inválida ou não encontrada.</p>
            </div>
        );
    }

    /* 🔹 UI */
    return (
        <div style={{ padding: "20px" }}>
            <h1>Minha Coleção</h1>

            {/* 📊 Estatísticas */}
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
                <StatBlock value={uniqueCards} label="Cartas Únicas" />
                <StatBlock value={`R$ ${estimatedValue.toFixed(2)}`} label="Valor Estimado" />
                <StatBlock value={`R$ ${currentCollectionValue.toFixed(2)}`} label="Valor Atual da Coleção" />
            </div>

            {/* 🃏 Lista */}
            <SearchFilters filters={filters} onChange={setFilters} />

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <button
                    onClick={() => setShowAddCardsModal(true)} style={{
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
                {filteredCollection.length === 0 ? (
                    <p style={{ color: "#999" }}>Nenhuma carta corresponde aos filtros.</p>
                ) : (
                    <div className="card-grid">
                        {filteredCollection.map((card) => (
                            <CardItemDetail
                                key={card.id}
                                card={card}
                                onClick={() => setSelectedCard(card)}
                                onToggleOwned={(owned) => {
                                    setCollection((prev) =>
                                        prev.map((c) => (c.id === card.id ? { ...c, owned } : c))
                                    );

                                    toggleCollectionCard(collectionId, card.id, owned);
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
