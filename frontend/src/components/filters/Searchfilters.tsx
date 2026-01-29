import { useState } from "react";
import { CardAutocomplete } from "../CardAutocomplete";
import { SetAutocomplete } from "../SetAutocomplete";
import { RaridadeSelect } from "./Raridadeselect";
import { IllustratorAutocomplete } from "./Illustratorautocomplete";
import { OverNumberToggle } from "./Overnumbertoggle";
import { PriceRangeFilter } from "./Pricerangefilter";

export interface SearchFiltersState {
    nome: string;
    set: string;
    raridade: string;
    ilustrador: string;
    over: boolean | null;
    preco_min: string;
    preco_max: string;
}

type Props = {
    filters: SearchFiltersState;
    onChange: (filters: SearchFiltersState) => void;
};

export function SearchFilters({ filters, onChange }: Props) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateFilter = (key: keyof SearchFiltersState, value: any) => {
        onChange({ ...filters, [key]: value });
    };

    const clearAll = () => {
        onChange({
            nome: "",
            set: "",
            raridade: "",
            ilustrador: "",
            over: null,
            preco_min: "",
            preco_max: "",
        });
    };

    const hasActiveFilters = Object.values(filters).some(
        (v) => v !== "" && v !== null
    );

    return (
        <div
            style={{
                background: "#fff",
                padding: "16px",
                borderRadius: "12px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                marginBottom: "20px",
            }}
        >
            {/* Título e Botão de Limpar */}
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "16px",
                }}
            >
                <h3 style={{ margin: 0, fontSize: "1.1rem" }}>🔍 Buscar Cartas</h3>
                {hasActiveFilters && (
                    <button
                        onClick={clearAll}
                        style={{
                            padding: "6px 12px",
                            borderRadius: "6px",
                            border: "none",
                            background: "#ef5350",
                            color: "#fff",
                            fontSize: "12px",
                            cursor: "pointer",
                        }}
                    >
                        Limpar tudo
                    </button>
                )}
            </div>

            {/* Busca Básica */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <CardAutocomplete
                    value={filters.nome}
                    onSelect={(nome) => updateFilter("nome", nome)}
                />

                <SetAutocomplete
                    value={filters.set}
                    onChange={(set) => updateFilter("set", set)}
                />

                {/* Toggle Filtros Avançados */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    style={{
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #ddd",
                        background: showAdvanced ? "#f6c400" : "#fff",
                        color: showAdvanced ? "#111" : "#666",
                        cursor: "pointer",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        fontWeight: showAdvanced ? 600 : 400,
                    }}
                >
                    <span>⚙️ Filtros Avançados</span>
                    <span>{showAdvanced ? "▲" : "▼"}</span>
                </button>

                {/* Filtros Avançados */}
                {showAdvanced && (
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                            padding: "12px",
                            background: "#f9f9f9",
                            borderRadius: "8px",
                        }}
                    >
                        <RaridadeSelect
                            value={filters.raridade}
                            onChange={(raridade) => updateFilter("raridade", raridade)}
                        />

                        <IllustratorAutocomplete
                            value={filters.ilustrador}
                            onChange={(ilustrador) => updateFilter("ilustrador", ilustrador)}
                        />

                        <div>
                            <label
                                style={{
                                    display: "block",
                                    fontSize: "12px",
                                    color: "#666",
                                    marginBottom: "6px",
                                    fontWeight: 500,
                                }}
                            >
                                Tipo de Carta
                            </label>
                            <OverNumberToggle
                                value={filters.over}
                                onChange={(over) => updateFilter("over", over)}
                            />
                        </div>

                        <PriceRangeFilter
                            minValue={filters.preco_min}
                            maxValue={filters.preco_max}
                            onMinChange={(preco_min) => updateFilter("preco_min", preco_min)}
                            onMaxChange={(preco_max) => updateFilter("preco_max", preco_max)}
                        />
                    </div>
                )}
            </div>

            {/* Indicador de Filtros Ativos */}
            {hasActiveFilters && (
                <div
                    style={{
                        marginTop: "12px",
                        padding: "8px 12px",
                        background: "#e3f2fd",
                        borderRadius: "6px",
                        fontSize: "12px",
                        color: "#1976d2",
                    }}
                >
                    <strong>Filtros ativos:</strong>{" "}
                    {[
                        filters.nome && `Nome: "${filters.nome}"`,
                        filters.set && `Set: ${filters.set}`,
                        filters.raridade && `Raridade: ${filters.raridade}`,
                        filters.ilustrador && `Ilustrador: ${filters.ilustrador}`,
                        filters.over === true && "Over-Number",
                        filters.over === false && "Normais",
                        filters.preco_min && `Preço min: R$ ${filters.preco_min}`,
                        filters.preco_max && `Preço max: R$ ${filters.preco_max}`,
                    ]
                        .filter(Boolean)
                        .join(" • ")}
                </div>
            )}
        </div>
    );
}