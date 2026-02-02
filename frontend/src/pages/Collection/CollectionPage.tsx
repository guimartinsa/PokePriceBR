import { useEffect, useState } from "react";
import api  from "../../api/api";
import type { Card } from "../../types/Card";
import { CardGrid } from "../../components/cards/CardGrid";
import { Loading } from "../../components/Loading";
import { Section } from "../../components/ui/Section";
import { StatBlock } from "../../components/ui/StatBlock";
import { fetchUserCollection } from "../../services/collection";

export default function CollectionPage() {
    const [collection, setCollection] = useState<Card[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        total: 0,
        unique: 0,
        totalValue: 0,
    });

    useEffect(() => {
        loadCollection();
    }, []);

    async function loadCollection() {
        try {
            // 1️⃣ Buscar coleção do backend
            const userCards = await fetchUserCollection();

            if (userCards.length === 0) {
                setCollection([]);
                setStats({ total: 0, unique: 0, totalValue: 0 });
                return;
            }

            // 2️⃣ Buscar dados completos das cartas
            const cardPromises = userCards.map((item) =>
                api.get<Card>(`/cards/${item.card_id}/`).then((res) => res.data)
            );

            const cards = await Promise.all(cardPromises);

            // 3️⃣ Expandir quantidade (ex: quantity = 2 → carta duplicada)
            const expandedCards: Card[] = [];

            userCards.forEach((item) => {
                const card = cards.find((c) => c.id === item.card_id);
                if (!card) return;


            });

            setCollection(expandedCards);

            // 4️⃣ Estatísticas
            const uniqueCards = new Set(userCards.map((c) => c.card_id)).size;

            const totalValue = expandedCards.reduce((sum, card) => {
                const price = parseFloat(card.preco_med || "0");
                return sum + price;
            }, 0);

            setStats({
                total: expandedCards.length,
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

            {/* Estatísticas */}
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

            {/* Lista */}
            <Section title="Suas Cartas">
                {collection.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                        <p>Você ainda não possui cartas na sua coleção.</p>
                    </div>
                ) : (
                    <CardGrid cards={collection} />
                )}
            </Section>
        </div>
    );
}
