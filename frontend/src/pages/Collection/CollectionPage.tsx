import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import api from "../../api/api";
import type { Card } from "../../types/Card";

//import { CardGrid } from "../../components/cards/CardGrid";
import { Loading } from "../../components/Loading";
import { Section } from "../../components/ui/Section";
import { StatBlock } from "../../components/ui/StatBlock";

import {
    fetchCollectionCards,
    toggleCollectionCard,
    type CollectionCard,
} from "../../services/collection";
import { CardItemDetail } from "../../components/cards/CardItemDetail";

/* 🔹 Tipo local: carta + owned */
type CardWithOwned = Card & {
    owned: boolean;
};

export default function CollectionPage() {
    /* 🔹 Params */
    const { id } = useParams();
    const collectionId = id ? Number(id) : null;

    /* 🔹 State */
    const [collection, setCollection] = useState<CardWithOwned[]>([]);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        total: 0,
        unique: 0,
        totalValue: 0,
    });

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
            const collectionCards: CollectionCard[] =
                await fetchCollectionCards(collectionId!);

            if (collectionCards.length === 0) {
                setCollection([]);
                setStats({ total: 0, unique: 0, totalValue: 0 });
                return;
            }

            const cards = await Promise.all(
                collectionCards.map((item) =>
                    api.get<Card>(`/cards/${item.card_id}/`).then((r) => r.data)
                )
            );

            const combined: CardWithOwned[] = collectionCards
                .map((item) => {
                    const card = cards.find((c) => c.id === item.card_id);
                    if (!card) return null;

                    return {
                        ...card,
                        owned: item.owned,
                    };
                })
                .filter((c): c is CardWithOwned => Boolean(c));

            setCollection(combined);

            const unique = new Set(combined.map((c) => c.id)).size;
            const totalValue = combined.reduce(
                (sum, c) => sum + parseFloat(c.preco_med || "0"),
                0
            );

            setStats({
                total: combined.length,
                unique,
                totalValue,
            });
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
                <StatBlock
                    value={`R$ ${stats.totalValue.toFixed(2)}`}
                    label="Valor Estimado"
                />
            </div>

            {/* 🃏 Lista */}
            <Section title="Suas Cartas">
                {collection.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                        <p>Você ainda não possui cartas nesta coleção.</p>
                    </div>
                ) : (
                    <div className="card-grid">
                        {collection.map((card) => (
                            <CardItemDetail
                                key={card.id}
                                card={card}
                                onToggleOwned={(owned) => {
                                    setCollection((prev) =>
                                        prev.map((c) =>
                                            c.id === card.id ? { ...c, owned } : c
                                        )
                                    );

                                    toggleCollectionCard(collectionId, card.id, owned);
                                }}
                            />
                        ))}
                    </div>
                )}
            </Section>
        </div>
    );
}
