import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchCards } from "../api/cards";
import type { Card } from "../types/Card";
import { CardItemDetail } from "../components/cards/CardItemDetail";
import { Loading } from "../components/Loading";
import "./series.css";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

export default function ArtistDetailPage() {
    const { artistName = "" } = useParams<{ artistName: string }>();
    const navigate = useNavigate();

    const decodedArtist = useMemo(() => decodeURIComponent(artistName), [artistName]);

    const [cards, setCards] = useState<Card[]>([]);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        setLoading(true);
        setPage(1);

        fetchCards({ page: 1, ilustrador: decodedArtist, ordenar: "lancamento" })
            .then((data) => {
                setCards(data.results);
                setHasMore(Boolean(data.next));
            })
            .finally(() => setLoading(false));
    }, [decodedArtist]);

    async function handleLoadMore() {
        const nextPage = page + 1;
        setLoadingMore(true);

        try {
            const data = await fetchCards({ page: nextPage, ilustrador: decodedArtist, ordenar: "lancamento" });
            setCards((prev) => [...prev, ...data.results]);
            setPage(nextPage);
            setHasMore(Boolean(data.next));
        } finally {
            setLoadingMore(false);
        }
    }

    const oldestCard = cards[cards.length - 1] ?? cards[0] ?? null;

    if (loading) return <Loading />;

    return (
        <main className="series-detail-page">
            <button type="button" className="series-back" onClick={() => navigate("/artists")}>
                ← Voltar para artistas
            </button>

            <header className="series-page__header artists-header">
                <h1>{decodedArtist}</h1>
                <p>Todas as cartas desse artista ({cards.length}{hasMore ? "+" : ""}).</p>
            </header>

            {oldestCard && (
                <section className="artist-oldest-highlight">
                    <div className="artist-oldest-highlight__image">
                        {oldestCard.imagem ? <img src={oldestCard.imagem} alt={oldestCard.nome} /> : <span>Sem imagem</span>}
                    </div>
                    <div>
                        <strong>Carta mais antiga</strong>
                        <h2>{oldestCard.nome}</h2>
                        <p>
                            {oldestCard.set?.nome}
                            {oldestCard.set?.release_date ? ` • ${dateFormatter.format(new Date(oldestCard.set.release_date))}` : ""}
                        </p>
                    </div>
                </section>
            )}

            {cards.length === 0 ? (
                <p>Nenhuma carta encontrada para esse artista.</p>
            ) : (
                <>
                    <div className="card-grid">
                        {cards.map((card) => (
                            <CardItemDetail key={card.id} card={card} compact onClick={() => navigate(`/cards/${card.id}`)} />
                        ))}
                    </div>

                    {hasMore && (
                        <button
                            type="button"
                            onClick={() => void handleLoadMore()}
                            disabled={loadingMore}
                            className="artist-load-more"
                        >
                            {loadingMore ? "Carregando..." : "Carregar mais cartas"}
                        </button>
                    )}
                </>
            )}
        </main>
    );
}
