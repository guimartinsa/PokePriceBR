import { useEffect, useState } from "react";
import { fetchSets } from "../api/sets";
import type { Set } from "../types/Set";
import { useDebounce } from "../hooks/useDebounce";

type Props = {
  value: string;
  onChange: (value: string) => void;
};

export function SetAutocomplete({ value, onChange }: Props) {
  const [sets, setSets] = useState<Set[]>([]);
  const [open, setOpen] = useState(false);

  const debouncedValue = useDebounce(value);

  useEffect(() => {
    if (debouncedValue.length < 2) {
      setSets([]);
      return;
    }

    fetchSets(debouncedValue)
      .then(setSets)
      .catch(() => setSets([]));
  }, [debouncedValue]);

  return (
    <div style={{ position: "relative", width: 220 }}>
      <input
        placeholder="Set (ex: DRI)"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />

      {open && sets.length > 0 && (
        <ul
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 6,
            listStyle: "none",
            padding: 0,
            margin: 4,
            zIndex: 10,
            maxHeight: 200,
            overflowY: "auto",
          }}
        >
          {sets.map((set) => (
            <li
              key={set.id}
              style={{
                padding: 8,
                cursor: "pointer",
              }}
              onMouseDown={() => {
                onChange(set.codigo);
                setOpen(false);
              }}
            >
              <strong>{set.codigo}</strong> – {set.nome}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
