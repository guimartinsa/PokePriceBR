import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchSeries, type SeriesItem } from "../api/series";
import "./series.css";

function getSeriesReleaseDate(serie: SeriesItem): string | null {
    const validDates = serie.sets
        .map((setItem) => setItem.release_date)
        .filter((date): date is string => Boolean(date));

    if (validDates.length === 0) return null;

    return validDates.sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0];
}

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

export default function SeriesPage() {
    const [series, setSeries] = useState<SeriesItem[]>([]);
    const [loadingSeries, setLoadingSeries] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSeries()
            .then(setSeries)
            .finally(() => setLoadingSeries(false));
    }, []);

    const sortedSeries = useMemo(
        () =>
            [...series].sort((a, b) => {
                const dateA = getSeriesReleaseDate(a);
                const dateB = getSeriesReleaseDate(b);

                if (!dateA && !dateB) return a.nome.localeCompare(b.nome);
                if (!dateA) return 1;
                if (!dateB) return -1;

                return new Date(dateB).getTime() - new Date(dateA).getTime();
            }),
        [series],
    );


    if (loadingSeries) return <p style={{ padding: 16 }}>Carregando series...</p>;

    return (
        <main className="series-page">
            <header className="series-page__header">
                <h1>Series</h1>
                <p>Toque em uma serie para abrir a pagina exclusiva com os sets.</p>
            </header>

            <section className="series-grid" aria-label="Lista de series">
                {sortedSeries.map((serie) => {
                    const releaseDate = getSeriesReleaseDate(serie);

                return (
                        <button
                            key={serie.id}
                            type="button"
                            className="series-card"
                            onClick={() => navigate(`/series/${serie.id}`)}
                        >
                            <div className="series-card__logo-wrap">
                                {serie.logo ? <img src={serie.logo} alt={`Logo da serie ${serie.nome}`} className="series-card__logo" /> : null}
                            </div>

                            <strong className="series-card__name">{serie.nome}</strong>
                            <span className="series-card__date">
                                {releaseDate ? dateFormatter.format(new Date(releaseDate)) : "Data indisponivel"}
                            </span>
                        </button>

                    );
                })}
            </section>
        </main>
    );
}
