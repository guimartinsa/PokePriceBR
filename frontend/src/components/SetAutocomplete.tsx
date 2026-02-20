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
    <div style={{ position: "relative", width: "100%" }}>
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
          <ul className="autocomplete-list">
          {sets.map((set) => (
            <li
              key={set.id}
              onMouseDown={() => {
                onChange(set.codigo);
                setOpen(false);
              }}
            >
              <div>
                <strong>{set.codigo}</strong>
                <small>{set.nome}</small>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
