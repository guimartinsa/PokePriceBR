import "./series.css";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { fetchSeries, type SeriesItem, type SeriesSet } from "../api/series";
import { fetchCollectionSetProgress, fetchCollections } from "../services/collection";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
});

type ProgressBySetId = Record<number, { owned: number; total: number }>;

function getLevel(percentage: number): number {
    if (percentage >= 75) return 3;
    if (percentage >= 50) return 2;
    if (percentage > 0) return 1;
    return 0;
}

export default function SeriesDetailPage() {
    const { seriesId = "" } = useParams<{ seriesId: string }>();
    const navigate = useNavigate();

    const [series, setSeries] = useState<SeriesItem[]>([]);
    const [loadingSeries, setLoadingSeries] = useState(true);

    const [selectedCollectionId, setSelectedCollectionId] = useState<number | null>(null);
    const [progressBySetId, setProgressBySetId] = useState<ProgressBySetId>({});

    useEffect(() => {
        fetchSeries()
            .then(setSeries)
            .finally(() => setLoadingSeries(false));

        fetchCollections()
            .then((items) => {
                if (items.length > 0) {
                    setSelectedCollectionId(items[0].id);
                }
            })
            .catch(() => setSelectedCollectionId(null));
    }, []);

    const selectedSeries = useMemo(
        () => series.find((item) => item.id === Number(seriesId)),
        [series, seriesId],
    );

    const orderedSets = useMemo(
        () =>
            [...(selectedSeries?.sets ?? [])].sort((a, b) => {
                if (!a.release_date && !b.release_date) return a.nome.localeCompare(b.nome);
                if (!a.release_date) return 1;
                if (!b.release_date) return -1;
                return new Date(b.release_date).getTime() - new Date(a.release_date).getTime();
            }),
        [selectedSeries],
    );

    useEffect(() => {
        if (!selectedSeries) return;

        const fetchProgress = async () => {
            const ownedBySetId: Record<number, number> = {};

            if (selectedCollectionId) {
                const rows = await fetchCollectionSetProgress(selectedCollectionId);
                rows.forEach((row) => {
                    if (row.set_id) {
                        ownedBySetId[row.set_id] = row.owned;
                    }
                });
            }

            const nextProgress: ProgressBySetId = {};
            selectedSeries.sets.forEach((setItem) => {
                nextProgress[setItem.id] = {
                    owned: ownedBySetId[setItem.id] ?? 0,
                    total: setItem.cards_total ?? 0,
                };
            });

            setProgressBySetId(nextProgress);
        };

        fetchProgress().catch(() => setProgressBySetId({}));
    }, [selectedCollectionId, selectedSeries]);

    if (loadingSeries) return <p style={{ padding: 16 }}>Carregando serie...</p>;

    if (!selectedSeries) {
        return (
            <main style={{ padding: 16 }}>
                <button type="button" className="series-back" onClick={() => navigate("/series")}>
                    Voltar para series
                </button>
                <p>Serie nao encontrada.</p>
            </main>
        );
    }

    return (
        <main className="series-detail-page">
            <button type="button" className="series-back" onClick={() => navigate("/series")}>All Series</button>

            <section className="series-detail-hero">
                {selectedSeries.logo ? <img src={selectedSeries.logo} alt={selectedSeries.nome} className="series-detail-hero__logo" /> : null}
            </section>

            <section className="series-set-list">
                {orderedSets.map((setItem) => (
                    <SeriesSetCard
                        key={setItem.id}
                        setItem={setItem}
                        progress={progressBySetId[setItem.id]}
                        onOpenSet={() => setItem.codigo_liga && navigate(`/series/sets/${encodeURIComponent(setItem.codigo_liga)}`)}
                    />
                ))}
            </section>
        </main>
    );
}

function SeriesSetCard({
    setItem,
    progress,
    onOpenSet,
}: {
    setItem: SeriesSet;
    progress?: { owned: number; total: number };
    onOpenSet: () => void;
}) {
    const total = progress?.total ?? 0;
    const owned = progress?.owned ?? 0;
    const percentage = total > 0 ? (owned / total) * 100 : 0;
    const level = getLevel(percentage);

    return (
        <button type="button" className="series-set-card" onClick={onOpenSet} disabled={!setItem.codigo_liga}>
            <div className="series-set-card__image">{setItem.logo ? <img src={setItem.logo} alt={setItem.nome} /> : null}</div>

            <div className="series-set-card__content">
                <div>
                    <h2>{setItem.nome}</h2>
                    <p>{setItem.release_date ? dateFormatter.format(new Date(setItem.release_date)) : "Data indisponivel"}</p>
                </div>

                <div className="series-set-card__meta">
                    <span>
                        {owned}/{total} Collected
                    </span>
                    <strong>LVL {level}</strong>
                </div>

                <div className="series-set-card__progress">
                    <span className={percentage >= 25 ? "is-active" : ""} />
                    <span className={percentage >= 50 ? "is-active" : ""} />
                    <span className={percentage >= 75 ? "is-active" : ""} />
                    <div className="series-set-card__bar">
                        <div style={{ width: `${Math.min(percentage, 100)}%` }} />
                    </div>
                    <strong>{percentage.toFixed(1)}%</strong>
                </div>
            </div>
        </button>
    );
}


