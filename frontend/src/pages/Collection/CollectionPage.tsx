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
    type CollectionCard,
} from "../../services/collection";
import { CardItemDetail } from "../../components/cards/CardItemDetail";
import { AddCardsPanel } from "./AddCardsPanel";

/* 🔹 Tipo local: carta + owned */
/*type CardWithOwned = Card & {owned: boolean;};*/

function getLowestPrice(card: { preco_min?: string | null; preco_med?: string | null; preco_max?: string | null }): string | null {
    const values = [card.preco_min, card.preco_med, card.preco_max]
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value > 0);

    if (values.length === 0) return null;
    return Math.min(...values).toFixed(2);
}

export default function CollectionPage() {
    /* 🔹 Params */
    const { id } = useParams();
    const collectionId = id ? Number(id) : null;

    /* 🔹 State */
    const [collection, setCollection] = useState<CollectionCard[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedCard, setSelectedCard] = useState<CollectionCard | null>(null);

    const [stats, setStats] = useState({
        total: 0,
        unique: 0,
        totalValue: 0,
    });

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

    const [addMode, setAddMode] = useState(false);
    const [isUpdatingPrices, setIsUpdatingPrices] = useState(false);
    const [updateMessage, setUpdateMessage] = useState<string | null>(null);

    /* 🔹 Effect */
    useEffect(() => {
        if (!collectionId) {
            setLoading(false);
            return;
        }

        loadCollection();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [collectionId]);

    /* 🔹 Load */
    async function loadCollection() {
        setLoading(true);

        try {
            const cards = await fetchCollectionCards(collectionId!);

            setCollection(cards);

            const unique = new Set(cards.map((c) => c.id)).size;

            const totalValue = cards.reduce((sum, c) => sum + parseFloat(c.preco_med || "0"), 0);

            setStats({ total: cards.length, unique, totalValue });

        } catch (err) {
            console.error("Erro ao carregar coleção:", err);
        } finally {
            setLoading(false);
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

    const selectedCardLowestPrice = selectedCard ? getLowestPrice(selectedCard) : null;

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
                <StatBlock value={stats.total} label="Total de Cartas" />
                <StatBlock value={stats.unique} label="Cartas Únicas" />
                <StatBlock value={`R$ ${stats.totalValue.toFixed(2)}`} label="Valor Estimado" />
            </div>

            {/* 🃏 Lista */}
            <SearchFilters filters={filters} onChange={setFilters} />

            <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
                <button
                    onClick={() => setAddMode((v) => !v)}
                    style={{
                        padding: "8px 12px",
                        borderRadius: 8,
                        background: "#d61d1d",
                        color: "#fff",
                        border: "none",
                        cursor: "pointer",
                    }}
                >
                    {addMode ? "✖ Fechar busca" : "➕ Adicionar cartas"}
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

            {addMode && (
                <AddCardsPanel
                    collectionCardIds={collection.map((c) => c.id)}
                    onAdd={(cardId) => {
                        toggleCollectionCard(collectionId, cardId, false);
                        setCollection((prev) => {
                            if (prev.some((c) => c.id === cardId)) return prev;
                            return [...prev];
                        });
                    }}
                />
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
                <div className="collection-modal-overlay" onClick={() => setSelectedCard(null)}>
                    <div className="collection-modal-card" onClick={(e) => e.stopPropagation()}>
                        <button className="collection-modal-close" onClick={() => setSelectedCard(null)}>
                            ✕
                        </button>

                        <div className="collection-modal-content">
                            <img src={selectedCard.imagem || "/placeholder.png"} alt={selectedCard.nome} />

                            <div className="collection-modal-info">
                                <span className="collection-modal-tag">Detalhes da Carta</span>
                                <h3>{selectedCard.nome}</h3>
                                <p className="collection-modal-subtitle">
                                    {selectedCard.numero_completo} • {selectedCard.set?.nome}
                                </p>

                                <div className="collection-modal-price-grid">
                                    <div>
                                        <small>Menor valor</small>
                                        <strong>{selectedCardLowestPrice ? `R$ ${selectedCardLowestPrice}` : "Indisponível"}</strong>
                                    </div>
                                    <div>
                                        <small>Preço médio</small>
                                        <strong>{selectedCard.preco_med ? `R$ ${selectedCard.preco_med}` : "Indisponível"}</strong>
                                    </div>
                                    <div>
                                        <small>Maior valor</small>
                                        <strong>{selectedCard.preco_max ? `R$ ${selectedCard.preco_max}` : "Indisponível"}</strong>
                                    </div>
                                </div>

                                <p className="collection-modal-rarity">Raridade: {selectedCard.raridade || "Não informada"}</p>

                                {selectedCard.liga_url && (
                                    <a href={selectedCard.liga_url} target="_blank" rel="noreferrer" className="liga-link-button">
                                        Ver na Liga Pokémon
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}



