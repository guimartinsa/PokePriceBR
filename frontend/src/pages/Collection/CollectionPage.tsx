import { useEffect, useState } from "react";
import type { Card } from "../../types/Card";
import { CardGrid } from "../../components/cards/CardGrid";

export default function CollectionPage() {
    const [collection, setCollection] = useState<Card[]>([]);

    useEffect(() => {
        // Buscar cartas da localStorage ou API
        const owned = Object.keys(localStorage)
            .filter(key => key.startsWith("owned-") && localStorage.getItem(key) === "1")
            .map(key => key.replace("owned-", ""));

        // Fetch cards by IDs
        // setCollection(cards);
    }, []);

    return (
        <div>
            <h1>Minha Coleção</h1>
            <p>{collection.length} cartas</p>
            <CardGrid cards={collection} />
        </div>
    );
}