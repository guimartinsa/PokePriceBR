import { useEffect, useState } from "react";
import { fetchCards } from "../api/cards";
import type { Card } from "../types/Card";

export default function CardList() {
  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError(null);

    fetchCards({ page })
      .then((data) => {
        if (!mounted) return;

        setCards(data.results);
        setCount(data.count);
      })
      .catch((err) => {
        console.error(err);
        if (!mounted) return;
        setError("Erro ao carregar cartas");
      })
      .finally(() => {
        if (!mounted) return;
        setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page]);


  if (loading) return <p>Carregando...</p>;
  if (error) return <p>{error}</p>;

  return (
    <div style={{ padding: 16 }}>
      <h1>Cartas</h1>

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
