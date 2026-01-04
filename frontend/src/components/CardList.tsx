import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchCards } from "../api/cards";
import { fetchSets, type SetOption } from "../api/sets";
import type { Card } from "../types/Card";
import { CardItem } from "./CardItem";
//import { CardSkeleton } from "./CardSkeleton";
import { SetAutocomplete } from "./SetAutocomplete";
import { CardAutocomplete } from "./CardAutocomplete";
import { useDebounce } from "../hooks/useDebounce";


type Filters = {
  nome: string;
  set: string;
  raridade: string;
};

export default function CardList() {
  const [searchParams, {/*setSearchParams*/}] = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    nome: searchParams.get("nome") || "",
    set: searchParams.get("set") || "",
    raridade: searchParams.get("raridade") || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceFilters = useDebounce(filters, 400);

  const [setInput, setSetInput] = useState(filters.set);
  const debouncedSetInput = useDebounce(setInput, 300);

  const [setOptions, setSetOptions] = useState<SetOption[]>([]);
  const [showSetOptions, setShowSetOptions] = useState(false);


  /* ======================
     RESET quando filtro muda
  ====================== */
  useEffect(() => {
    setCards([]);
    setPage(1);
    setHasMore(true);
  }, [filters]);

  /* ======================
     FETCH
  ====================== */
  useEffect(() => {
    if (!hasMore) return;

    setLoading(true);
    setError(null);

    fetchCards({
      page,
      //nome: filters.nome || undefined,
      set: debounceFilters.set || undefined,
      raridade: debounceFilters.raridade || undefined,
    })
    .then((data) => {
      setCards((prev) =>
        page === 1 ? data.results : [...prev, ...data.results]
      );
      setHasMore(Boolean(data.next));
    })
      .catch(() => setError("Erro ao carregar cartas"))
      .finally(() => setLoading(false));
  }, [page, debounceFilters]);

  /* ======================
     INTERSECTION OBSERVER
  ====================== */
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );

    /*const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };*/

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }
    return () => observer.disconnect();

  }, [hasMore, loading]);

useEffect(() => {
  if (debouncedSetInput.length < 2) {
    setSetOptions([]);
    return;
  }

  fetchSets(debouncedSetInput)
    .then(setSetOptions)
    .catch(() => setSetOptions([]));
}, [debouncedSetInput]);


  /* ======================
     UI
  ====================== */
  return (
    <div style={{ padding: 16 }}>
      <h1>Cartas</h1>

      {/* FILTROS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <style>
          .card-grid {"{"}
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
            gap: 16px;
          {"}"}

        </style>
        <CardAutocomplete
          value={filters.nome || ""}
          onSelect={(nome) =>
            setFilters((f) => ({ ...f, nome }))
          }
        />

      
        <SetAutocomplete
          value={filters.set}
          onChange={(value) =>
            setFilters((f) => ({ ...f, set: value }))
          }
        />

        <div style={{ position: "relative", width: "100%" }}>
  <input
    placeholder="Set (ex: DRI ou Scarlet)"
    value={setInput}
    onChange={(e) => {
      setSetInput(e.target.value);
      setShowSetOptions(true);
    }}
    onBlur={() => setTimeout(() => setShowSetOptions(false), 150)}
  />

  {showSetOptions && setOptions.length > 0 && (
    <ul
      style={{
        position: "absolute",
        top: "100%",
        left: 0,
        right: 0,
        background: "#fff",
        border: "1px solid #ddd",
        borderRadius: 6,
        marginTop: 4,
        zIndex: 10,
        maxHeight: 220,
        overflowY: "auto",
      }}
    >
      {setOptions.map((opt) => (
        <li
          key={opt.id}
          style={{
            padding: 10,
            cursor: "pointer",
            borderBottom: "1px solid #eee",
          }}
          onMouseDown={() => {
            setFilters((f) => ({ ...f, set: opt.codigo }));
            setSetInput(`${opt.nome} (${opt.codigo})`);
            setSetOptions([]);
            setPage(1);
            setCards([]);
          }}
        >
          <strong>{opt.nome}</strong>
          <div style={{ fontSize: 12, opacity: 0.7 }}>
            {opt.codigo}
          </div>
        </li>
      ))}
    </ul>
  )}
</div>


        {/*<input
          placeholder="Raridade"
          value={filters.raridade}
          onChange={(e) =>
            setFilters((f) => ({ ...f, raridade: e.target.value }))
          }
        /> 
        */}
      </div>

      {/* LISTA */}
      <div className="card-grid">
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}
      </div>


      {error && <p>{error}</p>}

      {/* SENTINELA */}
      {hasMore && <div ref={loadMoreRef} style={{ height: 40 }} />}
    </div>
  );
}
