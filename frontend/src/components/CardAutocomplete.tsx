import { useEffect, useState } from "react";
import { fetchCardsAutocomplete } from "../api/cardsAutocomplete";
import type { CardAutocomplete } from "../types/CardAutocomplete";
import { useDebounce } from "../hooks/useDebounce";

type Props = {
  value: string;
  onSelect: (cardName: string) => void;
};

export function CardAutocomplete({ value, onSelect }: Props) {
  const [cards, setCards] = useState<CardAutocomplete[]>([]);
  const [open, setOpen] = useState(false);

  const debounced = useDebounce(value);

  useEffect(() => {
    if (debounced.length < 2) {
      setCards([]);
      return;
    }

    fetchCardsAutocomplete(debounced)
      .then(setCards)
      .catch(() => setCards([]));
  }, [debounced]);

  return (
    <div style={{ position: "relative", width: "100%" }}>
      <input
        placeholder="Buscar carta (ex: Pikachu)"
        value={value}
        onChange={(e) => {
          onSelect(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && cards.length > 0 && (
        <ul className="autocomplete-list">
          {cards.map((card) => (
            <li
              key={card.id}
              onMouseDown={() => {
                onSelect(card.nome);
                setOpen(false);
              }}
            >
              {card.imagem && (
                <img src={card.imagem} alt={card.nome} />
              )}

              <div>
                <strong>{card.nome}</strong>
                <small>
                  {card.numero_completo} • {card.set.codigo_liga}
                </small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
