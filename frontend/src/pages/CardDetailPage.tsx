import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/api";
import type { Card } from "../types/Card";

export default function CardDetailPage() {
    const { id } = useParams();
    const [card, setCard] = useState<Card | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get(`/cards/${id}/`)
            .then(res => setCard(res.data))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div>Carregando...</div>;
    if (!card) return <div>Carta não encontrada</div>;

    return (
        <div>
            <h1>{card.nome}</h1>
            <img src={card.imagem || undefined} alt={card.nome} />
            {/* Adicionar mais detalhes */}
        </div>
    );
}