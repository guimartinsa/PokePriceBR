import { useEffect, useState } from "react";
import { api } from "../../api/api";
import type { Card } from "../../types/Card";
import { CardGrid } from "../../components/cards/CardGrid";
import { Loading } from "../../components/Loading";
import { Section } from "../../components/ui/Section";
import { StatBlock } from "../../components/ui/StatBlock";

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
            // Buscar IDs das cartas marcadas como "owned" no localStorage
            const ownedIds = Object.keys(localStorage)
                .filter((key) => key.startsWith("owned-") && localStorage.getItem(key) === "1")
                .map((key) => key.replace("owned-", ""));

            if (ownedIds.length === 0) {
                setLoading(false);
                return;
            }

            // Buscar informações das cartas da API
            const promises = ownedIds.map((id) =>
                api.get<Card>(`/cards/${id}/`).then((res) => res.data)
            );

            const cards = await Promise.all(promises);
            setCollection(cards);

            // Calcular estatísticas
            const uniqueCards = new Set(cards.map((c) => c.id)).size;
            const totalValue = cards.reduce((sum, card) => {
                const price = parseFloat(card.preco_med || "0");
                return sum + price;
            }, 0);

            setStats({
                total: cards.length,
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

            {/* Lista de Cartas */}
            <Section title="Suas Cartas">
                {collection.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "40px", color: "#999" }}>
                        <p>Você ainda não possui cartas na sua coleção.</p>
                        <p style={{ marginTop: "8px" }}>
                            Marque cartas como "Tenho" para adicioná-las aqui!
                        </p>
                    </div>
                ) : (
                    <CardGrid cards={collection} />
                )}
            </Section>
        </div>
    );
}