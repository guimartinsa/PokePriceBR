import { useEffect, useState } from "react";
import api from "../api/api";
import type { Card } from "../types/Card";

export default function CardList() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Card[]>("/cards/")
      .then((res) => {
        setCards(res.data);
      })
      .catch((err: unknown) => {
        console.error(err);
        setError("Erro ao carregar cartas");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

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
    </div>
  );
}
