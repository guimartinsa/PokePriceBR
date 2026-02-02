import { useEffect, useState } from "react";
import api from "../../api/api";
import type { Card } from "../../types/Card";
import { CardGrid } from "../../components/cards/CardGrid";
import { CardItemDetail } from "../../components/cards/CardItemDetail";
import { Loading } from "../../components/Loading";
import { Section } from "../../components/ui/Section";
import { StatBlock } from "../../components/ui/StatBlock";
import {
    fetchUserCollection,
    toggleCollectionCard,
} from "../../services/collection";
import type { UserCard } from "../../services/collection";
import { useParams } from "react-router-dom";

/* 🔹 Tipo local: carta + owned */
type CardWithOwned = Card & {
    owned: boolean;
};

export default function CollectionPage() {
    /* ✅ Hook no lugar certo */
    const { id } = useParams();
    const collectionId = Number(id);

    const [collection, setCollection] = useState<CardWithOwned[]>([]);
    const [loading, setLoading] = useState(true);

    const [stats, setStats] = useState({
        total: 0,
        unique: 0,
        totalValue: 0,
    });

    useEffect(() => {
        loadCollection();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    async function loadCollection() {
        setLoading(true);

        try {
            /* 1️⃣ Buscar coleção do backend */
            const userCards: UserCard[] = await fetchUserCollection();

            if (userCards.length === 0) {
                setCollection([]);
                setStats({ total: 0, unique: 0, totalValue: 0 });
                return;
            }

            /* 2️⃣ Buscar dados completos das cartas */
            const cardPromises = userCards.map((item) =>
                api.get<Card>(`/cards/${item.card_id}/`).then((res) => res.data)
            );

            const cards = await Promise.all(cardPromises);

            /* 3️⃣ Combinar carta + owned */
            const combinedCards: CardWithOwned[] = userCards
                .map((item) => {
                    const card = cards.find((c) => c.id === item.card_id);
                    if (!card) return null;

                    return {
                        ...card,
                        owned: item.owned,
                    };
                })
                .filter((c): c is CardWithOwned => Boolean(c));

            setCollection(combinedCards);

            /* 4️⃣ Estatísticas */
            const uniqueCards = new Set(
                combinedCards.map((c) => c.id)
            ).size;

            const totalValue = combinedCards.reduce((sum, card) => {
                const price = parseFloat(card.preco_med || "0");
                return sum + price;
            }, 0);

            setStats({
                total: combinedCards.length,
                unique: uniqueCards,
                totalValue,
            });
        } catch (error) {
            console.error("Erro ao carregar coleção:", error);
        } finally {
            setLoading(false);
        }
    }

    if (loading) return <Loading />;

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
                    background: "rgba(255, 255, 255, 0.05)",
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

            {/* 🃏 Lista de cartas */}
            <Section title="Suas Cartas">
                {collection.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                        <p>Você ainda não possui cartas nesta coleção.</p>
                    </div>
                ) : (
                    <CardGrid
                        cards={collection}
                        renderItem={(card) => (
                            <CardItemDetail
                                key={card.id}
                                card={card}
                                owned={card.owned}
                                onToggleOwned={(value) => {
                                    /* ✅ UI otimista */
                                    setCollection((prev) =>
                                        prev.map((c) =>
                                            c.id === card.id
                                                ? { ...c, owned: value }
                                                : c
                                        )
                                    );

                                    /* ✅ Backend */
                                    toggleCollectionCard(
                                        collectionId,
                                        card.id,
                                        value
                                    );
                                }}
                            />
                        )}
                    />
                )}
            </Section>
        </div>
    );
}
