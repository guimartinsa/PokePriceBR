import { useEffect, useState } from "react";
import { fetchCards } from "../api/cards";
import type { Card } from "../types/Card";
import { useSearchParams } from "react-router-dom";




export default function CardList() {
  const [filters, setFilters] = useState({
    set: "",
    raridade: "",
    over: false,
  });


  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    fetchCards({
      page,
      set: filters.set || undefined,
      raridade: filters.raridade || undefined,
      over: filters.over,
    })
      .then((data) => {
        setCards(data.results);
        setCount(data.count);
      })
      .catch(() => setError("Erro ao carregar cartas"))
      .finally(() => setLoading(false));
  }, [page, filters]);


  if (loading) return <p>Carregando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 16 }}>
      <h1>Cartas</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        <input
          placeholder="Set (ex: DRI)"
          value={filters.set}
          onChange={(e) =>
            setFilters((f) => ({ ...f, set: e.target.value }))
          }
        />

        <input
          placeholder="Raridade"
          value={filters.raridade}
          onChange={(e) =>
            setFilters((f) => ({ ...f, raridade: e.target.value }))
          }
        />

        <label>
          <input
            type="checkbox"
            checked={filters.over}
            onChange={(e) =>
              setFilters((f) => ({ ...f, over: e.target.checked }))
            }
          />
          Over
        </label>
      </div>


      <ul style={{ listStyle: "none", padding: 0 }}>
        {cards.map((card) => (
          <li
            key={card.id}
            style={{
              border: "1px solid #ddd",
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <strong>{card.nome}</strong>
            <div>{card.numero_completo}</div>
            <div>{card.set.nome}</div>

            {card.preco_med && (
              <div>Preço médio: R$ {card.preco_med}</div>
            )}
          </li>
        ))}
      </ul>

      {/* PAGINAÇÃO */}
      <div style={{ marginTop: 16 }}>
        <button
          disabled={page === 1}
          onClick={() => setPage((p) => p - 1)}
        >
          Anterior
        </button>

        <span style={{ margin: "0 12px" }}>
          Página {page}
        </span>

        <button
          disabled={page * 20 >= count}
          onClick={() => setPage((p) => p + 1)}
        >
          Próxima
        </button>
      </div>
    </div>
  );
}
