import type { Card } from "../types/Card";

export function CardItem({ card }: { card: Card }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 12,
        border: "1px solid #e5e5e5",
        borderRadius: 12,
        padding: 12,
      }}
    >
      {card.imagem && (
        <img
          src={card.imagem}
          alt={card.nome}
          style={{ width: 80, borderRadius: 8 }}
        />
      )}

      <div>
        <strong>{card.nome}</strong>
        <div>{card.numero_completo}</div>
        <div>{card.set.nome}</div>

        {card.preco_med && (
          <div style={{ marginTop: 4 }}>
            💰 R$ {card.preco_med}
          </div>
        )}
      </div>
    </div>
  );
}
