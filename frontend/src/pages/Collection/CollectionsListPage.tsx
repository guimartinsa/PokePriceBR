import { useEffect, useState } from "react";
import {
    fetchCollections,
    createCollection,
    deleteCollection,
    type Collection,
} from "../../services/collection";
import { useNavigate } from "react-router-dom";

export default function CollectionsListPage() {
    const [collections, setCollections] = useState<Collection[]>([]);
    const [newName, setNewName] = useState("");
    const navigate = useNavigate();


    async function loadCollections() {
        try {
            const data = await fetchCollections();
            setCollections(data);
        } catch (err) {
            console.error(err);
        }
    }

    useEffect(() => {
        loadCollections();
    }, []);


    async function handleCreate() {
        if (!newName.trim()) return;

        try {
            const created = await createCollection(newName);
            setCollections((prev) => [...prev, created]);
            setNewName("");
        } catch (err) {
            console.error("Erro ao criar coleção", err);
        }
    }

    async function handleDelete(id: number) {
        const ok = confirm("Deseja excluir esta coleção?");
        if (!ok) return;

        try {
            await deleteCollection(id);
            setCollections((prev) => prev.filter((c) => c.id !== id));
        } catch (err) {
            console.error("Erro ao excluir coleção", err);
        }
    }

    return (
        <div style={{ padding: 20, maxWidth: 800, margin: "0 auto" }}>
            <h1>📁 Minhas Coleções</h1>

            {/* Criar coleção */}
            <div
                style={{
                    display: "flex",
                    gap: 8,
                    marginTop: 16,
                }}
            >
                <input
                    type="text"
                    placeholder="Nome da nova coleção"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    style={{
                        flex: 1,
                        padding: 10,
                        borderRadius: 8,
                        border: "1px solid #444",
                        background: "#121212",
                        color: "#fff",
                    }}
                />
                <button
                    onClick={handleCreate}
                    style={{
                        padding: "10px 16px",
                        borderRadius: 8,
                        border: "none",
                        background: "#4caf50",
                        color: "#fff",
                        cursor: "pointer",
                    }}
                >
                    Criar
                </button>
            </div>

            {/* Lista */}
            <div style={{ display: "grid", gap: 16, marginTop: 24 }}>
                {collections.length === 0 && (
                    <p style={{ color: "#999" }}>
                        Você ainda não criou nenhuma coleção.
                    </p>
                )}

                {collections.map((col) => (
                    <div
                        key={col.id}
                        style={{
                            padding: 16,
                            borderRadius: 12,
                            background: "#1e1e1e",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        }}
                    >
                        <div
                            onClick={() =>
                                navigate(`/collections/${col.id}`)
                            }
                            style={{ cursor: "pointer" }}
                        >
                            <strong>{col.name}</strong>
                        </div>

                        <button
                            onClick={() => handleDelete(col.id)}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#f44336",
                                cursor: "pointer",
                            }}
                        >
                            Excluir
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}
