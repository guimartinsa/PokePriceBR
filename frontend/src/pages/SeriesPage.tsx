import { useEffect, useState } from "react";
import { fetchSeries, type SeriesItem } from "../api/series";

export default function SeriesPage() {
    const [series, setSeries] = useState<SeriesItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchSeries()
            .then(setSeries)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <p style={{ padding: 16 }}>Carregando séries...</p>;

    return (
        <main style={{ padding: 16 }}>
            <h1>Séries</h1>
            {series.map((serie) => (
                <section key={serie.id} style={{ marginBottom: 20 }}>
                    <h2 style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {serie.logo ? <img src={serie.logo} alt={`Logo da série ${serie.nome}`} style={{ height: 28, objectFit: "contain" }} /> : null}
                        <span>{serie.nome}</span>
                    </h2>
                    <ul>
                        {serie.sets.map((setItem) => (
                            <li key={setItem.id}>
                                {setItem.nome}
                                {setItem.codigo_liga ? ` (${setItem.codigo_liga})` : ""}
                            </li>
                        ))}
                    </ul>
                </section>
            ))}
        </main>
    );
}