import { useState } from "react";

type Props = {
    minValue: string;
    maxValue: string;
    onMinChange: (value: string) => void;
    onMaxChange: (value: string) => void;
};

export function PriceRangeFilter({
    minValue,
    maxValue,
    onMinChange,
    onMaxChange,
}: Props) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div style={{ marginBottom: "8px" }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    border: "1px solid #ddd",
                    background: "#0f1a26 ",
                    cursor: "pointer",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "14px",
                }}
            >
                <span>💰 Filtro de Preço</span>
                <span>{expanded ? "▲" : "▼"}</span>
            </button>

            {expanded && (
                <div
                    style={{
                        marginTop: "8px",
                        padding: "12px",
                        background: "#0f1a26 ",
                        borderRadius: "6px",
                        border: "1px solid #eee",
                    }}
                >
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "#666",
                                    marginBottom: "4px",
                                }}
                            >
                                Preço Mínimo
                            </label>
                            <input
                                type="number"
                                placeholder="R$ 0,00"
                                value={minValue}
                                onChange={(e) => onMinChange(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    border: "1px solid #ddd",
                                    fontSize: "14px",
                                }}
                            />
                        </div>

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "#666",
                                    marginBottom: "4px",
                                }}
                            >
                                Preço Máximo
                            </label>
                            <input
                                type="number"
                                placeholder="R$ 999,99"
                                value={maxValue}
                                onChange={(e) => onMaxChange(e.target.value)}
                                style={{
                                    width: "100%",
                                    padding: "8px",
                                    borderRadius: "4px",
                                    border: "1px solid #ddd",
                                    fontSize: "14px",
                                }}
                            />
                        </div>
                    </div>

                    {(minValue || maxValue) && (
                        <button
                            onClick={() => {
                                onMinChange("");
                                onMaxChange("");
                            }}
                            style={{
                                marginTop: "8px",
                                padding: "6px 12px",
                                borderRadius: "4px",
                                border: "none",
                                background: "#ef5350",
                                color: "#fff",
                                fontSize: "12px",
                                cursor: "pointer",
                                width: "100%",
                            }}
                        >
                            Limpar filtro de preço
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}