import { useState } from "react";
import { CardAutocomplete } from "../CardAutocomplete";
import { SetAutocomplete } from "../SetAutocomplete";
//import { RaridadeSelect } from "./Raridadeselect";
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

    const updateFilter = (key: keyof SearchFiltersState, value: string | boolean | null) => {
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

    const hasActiveFilters = Object.values(filters).some((v) => v !== "" && v !== null);

    return (
        <div className="filters-panel">
            <div className="filters-header">
                <h3>🔍 Buscar Cartas</h3>

                {hasActiveFilters && (
                    <button onClick={clearAll} className="filters-clear-btn">
                        Limpar tudo
                    </button>
                )}
            </div>

            {/* Busca Básica */}
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <CardAutocomplete value={filters.nome} onSelect={(nome) => updateFilter("nome", nome)} />

                <SetAutocomplete value={filters.set} onChange={(set) => updateFilter("set", set)} />

                {/* Toggle Filtros Avançados */}
                <button
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className={`filters-advanced-toggle ${showAdvanced ? "active" : ""}`}
                >
                    <span>⚙️ Filtros avançados</span>
                    <span>{showAdvanced ? "▲" : "▼"}</span>
                </button>

                {/* Filtros Avançados */}
                {showAdvanced && (
                    <div className="filters-advanced-area">

                        <IllustratorAutocomplete
                            value={filters.ilustrador}
                            onChange={(ilustrador) => updateFilter("ilustrador", ilustrador)}
                        />

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
                <div className="filters-active-info">
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