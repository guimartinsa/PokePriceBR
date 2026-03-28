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
                        <button
                            key={artist.artist}
                            className="artist-list-item"
                            type="button"
                            onClick={() => navigate(`/artists/${encodeURIComponent(artist.artist)}`)}
                        >
                            <div className="artist-list-item__image">
                                {artist.oldest_card.imagem ? (
                                    <img
                                        src={artist.oldest_card.imagem}
                                        alt={artist.oldest_card.nome}
                                    />
                                ) : (
                                    <span>Sem imagem</span>
                                )}
                            </div>

                            <div className="artist-list-item__content">
                                <h2>{artist.artist}</h2>
                                <p>
                                    {artist.total_cards} carta(s) • Carta mais antiga: {artist.oldest_card.nome}
                                </p>
                                <small>
                                    {artist.oldest_card.set?.nome}
                                    {oldestDate ? ` • ${dateFormatter.format(new Date(oldestDate))}` : ""}
                                </small>
                            </div>
                        </button>
                    );
                })}
            </section>
        </main>
    );
}
