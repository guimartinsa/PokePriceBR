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
  const [searchParams, {/*setSearchParams*/ }] = useSearchParams();
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
  }, [debounceFilters]);

  /* ======================
     FETCH
  ====================== */
  useEffect(() => {
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    fetchCards({
      page,
      nome: debounceFilters.nome || undefined,
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
    if (!hasMore || loading || page === 1) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setPage((p) => p + 1);
        }
      },
      { rootMargin: "200px" }
    );

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loading, page]);


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
