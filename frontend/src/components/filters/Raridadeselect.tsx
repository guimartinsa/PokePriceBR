import { useEffect, useState } from "react";
import { api } from "../../api/api";

type Props = {
    value: string;
    onChange: (value: string) => void;
};

export function RaridadeSelect({ value, onChange }: Props) {
    const [raridades, setRaridades] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api
            .get<string[]>("/raridades/")
            .then((res) => setRaridades(res.data))
            .catch((err) => console.error("Erro ao carregar raridades:", err))
            .finally(() => setLoading(false));
    }, []);

    if (loading) {
        return (
            <select disabled style={{ width: "100%", padding: "8px 12px" }}>
                <option>Carregando...</option>
            </select>
        );
    }

    return (
        <select
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                fontSize: "14px",
                background: "#fff",
                cursor: "pointer",
            }}
        >
            <option value="">Todas as raridades</option>
            {raridades.map((raridade) => (
                <option key={raridade} value={raridade}>
                    {raridade}
                </option>
            ))}
        </select>
    );
}