import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { fetchSeries, type SeriesItem } from "../api/series";

export default function SeriesPage() {
    const [series, setSeries] = useState<SeriesItem[]>([]);
    const [loadingSeries, setLoadingSeries] = useState(true);
    const [expandedSeriesId, setExpandedSeriesId] = useState<number | null>(null);
    const navigate = useNavigate();

    useEffect(() => {
        fetchSeries()
            .then(setSeries)
            .finally(() => setLoadingSeries(false));
    }, []);

    if (loadingSeries) return <p style={{ padding: 16 }}>Carregando series...</p>;

    return (
        <main style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
            <h1>Series</h1>

            {series.map((serie) => {
                const isExpanded = expandedSeriesId === serie.id;

                return (
                    <section key={serie.id} style={{ marginBottom: 14, border: "1px solid #2c3440", borderRadius: 12 }}>
                        <button
                            type="button"
                            onClick={() => setExpandedSeriesId(isExpanded ? null : serie.id)}
                            style={{
                                width: "100%",
                                background: "transparent",
                                color: "inherit",
                                border: "none",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                padding: "12px 14px",
                                cursor: "pointer",
                            }}
                        >
                            <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                {serie.logo ? <img src={serie.logo} alt={`Logo da serie ${serie.nome}`} style={{ height: 30 }} /> : null}
                                <strong>{serie.nome}</strong>
                            </span>
                            <span>{isExpanded ? "-" : "+"}</span>
                        </button>

                        {isExpanded && (
                            <div style={{ padding: "0 14px 14px", display: "grid", gap: 8 }}>
                                {serie.sets.map((setItem) => {
                                    const setCode = setItem.codigo_liga;

                                    return (
                                        <button
                                            key={setItem.id}
                                            type="button"
                                            onClick={() => setCode && navigate(`/series/sets/${encodeURIComponent(setCode)}`)}
                                            disabled={!setCode}
                                            style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: 10,
                                                width: "100%",
                                                textAlign: "left",
                                                borderRadius: 10,
                                                border: "1px solid #2c3440",
                                                background: "#151a21",
                                                color: "inherit",
                                                padding: "10px",
                                                cursor: setCode ? "pointer" : "not-allowed",
                                                opacity: setCode ? 1 : 0.6,
                                            }}
                                        >
                                            {setItem.logo ? <img src={setItem.logo} alt={`Logo do set ${setItem.nome}`} style={{ height: 24 }} /> : null}
                                            <span>
                                                {setItem.nome}
                                                {setCode ? ` (${setCode})` : ""}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        )}
                    </section>
                );
            })}
        </main>
    );
}
