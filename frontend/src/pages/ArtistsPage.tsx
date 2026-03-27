import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchArtists, type ArtistGroup } from "../api/artists";
import "./series.css";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

export default function ArtistsPage() {
    const [artists, setArtists] = useState<ArtistGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const navigate = useNavigate();

    useEffect(() => {
        setLoading(true);
        fetchArtists()
            .then(setArtists)
            .finally(() => setLoading(false));
    }, []);

    const filteredArtists = useMemo(() => {
        const normalized = search.trim().toLowerCase();
        if (!normalized) return artists;

        return artists.filter((item) => item.artist.toLowerCase().includes(normalized));
    }, [artists, search]);

    if (loading) return <p style={{ padding: 16 }}>Carregando artistas...</p>;

    return (
        <main className="series-detail-page">
            <header className="series-page__header artists-header">
                <h1>Artistas</h1>
                <p>Veja a carta mais antiga de cada artista e todas as cartas agrupadas por ilustrador.</p>
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Filtrar por nome do artista"
                    aria-label="Filtrar artistas"
                />
            </header>

            <section className="series-set-list" aria-label="Lista de artistas">
                {filteredArtists.map((artist) => {
                    const oldestDate = artist.oldest_card.set?.release_date;

                    return (
                        <article key={artist.artist} className="artist-card">
                            <header className="artist-card__header">
                                <div>
                                    <h2>{artist.artist}</h2>
                                    <p>{artist.total_cards} carta(s)</p>
                                </div>
                            </header>

                            <section className="artist-oldest-card">
                                <div className="artist-oldest-card__image-wrap">
                                    {artist.oldest_card.imagem ? (
                                        <img
                                            src={artist.oldest_card.imagem}
                                            alt={artist.oldest_card.nome}
                                            className="artist-oldest-card__image"
                                        />
                                    ) : null}
                                </div>
                                <div>
                                    <strong>Carta mais antiga</strong>
                                    <h3>{artist.oldest_card.nome}</h3>
                                    <p>
                                        {artist.oldest_card.set?.nome}
                                        {oldestDate ? ` • ${dateFormatter.format(new Date(oldestDate))}` : ""}
                                    </p>
                                </div>
                            </section>

                            <div className="artist-cards-grid">
                                {artist.cards.map((card) => (
                                    <button
                                        key={card.id}
                                        className="artist-mini-card"
                                        type="button"
                                        onClick={() => navigate(`/cards/${card.id}`)}
                                    >
                                        {card.imagem ? <img src={card.imagem} alt={card.nome} /> : null}
                                        <span>{card.nome}</span>
                                    </button>
                                ))}
                            </div>
                        </article>
                    );
                })}
            </section>
        </main>
    );
}
