import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/api";
import type { Card } from "../types/Card";
import { Loading } from "../components/Loading";
import { Button } from "../components/ui/Button";
import {
    fetchCollections,
    addCardToCollection,
    type Collection,
} from "../services/collection";


export default function CardDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [card, setCard] = useState<Card | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [collections, setCollections] = useState<Collection[]>([]);
    const [showCollections, setShowCollections] = useState(false);


    useEffect(() => {
        if (!id) return;
        useEffect(() => {
            fetchCollections()
                .then(setCollections)
                .catch(console.error);
        }, []);


        api
            .get<Card>(`/cards/${id}/`)
            .then((res) => setCard(res.data))
            .catch(() => setError("Erro ao carregar carta"))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <Loading />;

    if (error || !card) {
        return (
            <div style={{ padding: "20px", textAlign: "center" }}>
                <h2>Carta não encontrada</h2>
                <p>{error || "A carta solicitada não existe."}</p>
                <Button onClick={() => navigate("/cards")}>Voltar para Cartas</Button>
            </div>
        );
    }

    return (
        <div style={{ padding: "20px", maxWidth: "800px", margin: "0 auto" }}>
            <Button
                variant="secondary"
                onClick={() => navigate("/cards")}
                style={{ marginBottom: "20px" }}
            >
                ← Voltar
            </Button>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "32px" }}>
                {/* Imagem da Carta */}
                <div>
                    <img
                        src={card.imagem || "/placeholder.png"}
                        alt={card.nome}
                        style={{
                            width: "100%",
                            borderRadius: "12px",
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                        }}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <button
                        onClick={() => setShowCollections((v) => !v)}
                        style={{
                            padding: "8px 12px",
                            borderRadius: 8,
                            border: "none",
                            background: "#4caf50",
                            color: "#fff",
                            cursor: "pointer",
                        }}
                    >
                        ➕ Adicionar à coleção
                    </button>

                    {showCollections && (
                        <div
                            style={{
                                marginTop: 8,
                                background: "#1e1e1e",
                                borderRadius: 8,
                                padding: 8,
                                display: "grid",
                                gap: 6,
                            }}
                        >
                            {collections.map((col) => (
                                <button
                                    key={col.id}
                                    onClick={() => {
                                        addCardToCollection(col.id, card.id);
                                        setShowCollections(false);
                                    }}
                                    style={{
                                        background: "transparent",
                                        border: "none",
                                        color: "#fff",
                                        textAlign: "left",
                                        cursor: "pointer",
                                        padding: "6px 8px",
                                    }}
                                >
                                    {col.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>


                {/* Informações */}
                <div>
                    <h1 style={{ marginBottom: "8px" }}>{card.nome}</h1>
                    <p style={{ color: "#666", marginBottom: "24px" }}>
                        {card.numero_completo} • {card.set.nome}
                    </p>

                    {/* Detalhes */}
                    <div style={{ marginBottom: "24px" }}>
                        <h3>Detalhes</h3>
                        <table style={{ width: "100%", marginTop: "12px" }}>
                            <tbody>
                                <tr>
                                    <td style={{ padding: "8px 0", fontWeight: 600 }}>Set:</td>
                                    <td>{card.set.nome}</td>
                                </tr>
                                <tr>
                                    <td style={{ padding: "8px 0", fontWeight: 600 }}>Número:</td>
                                    <td>{card.numero_completo}</td>
                                </tr>
                                {card.raridade && (
                                    <tr>
                                        <td style={{ padding: "8px 0", fontWeight: 600 }}>Raridade:</td>
                                        <td>{card.raridade}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Preços */}
                    {(card.preco_min || card.preco_med || card.preco_max) && (
                        <div>
                            <h3>Preços</h3>
                            <div
                                style={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(3, 1fr)",
                                    gap: "12px",
                                    marginTop: "12px",
                                }}
                            >
                                {card.preco_min && (
                                    <div
                                        style={{
                                            background: "#f5f5f5",
                                            padding: "12px",
                                            borderRadius: "8px",
                                            textAlign: "center",
                                        }}
                                    >
                                        <small style={{ display: "block", color: "#666" }}>Mínimo</small>
                                        <strong style={{ color: "#2e7d32", fontSize: "1.2rem" }}>
                                            R$ {card.preco_min}
                                        </strong>
                                    </div>
                                )}
                                {card.preco_med && (
                                    <div
                                        style={{
                                            background: "#f5f5f5",
                                            padding: "12px",
                                            borderRadius: "8px",
                                            textAlign: "center",
                                        }}
                                    >
                                        <small style={{ display: "block", color: "#666" }}>Médio</small>
                                        <strong style={{ color: "#2e7d32", fontSize: "1.2rem" }}>
                                            R$ {card.preco_med}
                                        </strong>
                                    </div>
                                )}
                                {card.preco_max && (
                                    <div
                                        style={{
                                            background: "#f5f5f5",
                                            padding: "12px",
                                            borderRadius: "8px",
                                            textAlign: "center",
                                        }}
                                    >
                                        <small style={{ display: "block", color: "#666" }}>Máximo</small>
                                        <strong style={{ color: "#2e7d32", fontSize: "1.2rem" }}>
                                            R$ {card.preco_max}
                                        </strong>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}