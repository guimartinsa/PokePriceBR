import { useEffect, useState } from "react";
import { fetchCollections, type Collection } from "../../services/collection";
import { useNavigate } from "react-router-dom";

export default function CollectionsListPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        fetchCollections()
            .then(setCollections)
            .catch(console.error);
    }, []);

    return (
        <div style={{ padding: 20 }}>
            <h1>Minhas Coleções</h1>

            <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
                {collections.map((col) => (
                    <div
                        key={col.id}
                        onClick={() => navigate(`/collections/${col.id}`)}
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            background: "#1e1e1e",
                            cursor: "pointer",
                        }}
                    >
                        <strong>{col.name}</strong>
                    </div>
                ))}
            </div>
        </div>
    );
}
