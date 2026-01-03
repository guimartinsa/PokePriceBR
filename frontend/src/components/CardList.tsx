import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchCards } from "../api/cards";
import type { Card } from "../types/Card";
import { CardItem } from "./CardItem";
import { CardSkeleton } from "./CardSkeleton";

type Filters = {
  set: string;
  raridade: string;
};

export default function CardList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState<Filters>({
    set: searchParams.get("set") || "",
    raridade: searchParams.get("raridade") || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    if (!hasMore || loading) return;

    setLoading(true);
    setError(null);

    const params: Record<string, string> = {};
    if (filters.set) params.set = filters.set;
    if (filters.raridade) params.raridade = filters.raridade;
    if (page > 1) params.page = String(page);

    setSearchParams(params);

    fetchCards({
      page,
      set: filters.set || undefined,
      raridade: filters.raridade || undefined,
    })
      .then((data) => {
        setCards((prev) =>
          page === 1 ? data.results : [...prev, ...data.results]
        );
        setHasMore(Boolean(data.next));
      })
      .catch(() => setError("Erro ao carregar cartas"))
      .finally(() => setLoading(false));
  }, [page, filters]);

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

    const el = loadMoreRef.current;
    if (el) observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [hasMore, loading]);

  /* ======================
     UI
  ====================== */
  return (
    <div style={{ padding: 16 }}>
      <h1>Cartas</h1>

      {/* FILTROS */}
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
      </div>

      {/* LISTA */}
      <ul style={{ listStyle: "none", padding: 0 }}>
        {cards.map((card) => (
          <CardItem key={card.id} card={card} />
        ))}

        {loading &&
          Array.from({ length: 3 }).map((_, i) => (
            <CardSkeleton key={`skeleton-${i}`} />
          ))}
      </ul>

      {error && <p>{error}</p>}

      {/* SENTINELA */}
      {hasMore && <div ref={loadMoreRef} style={{ height: 40 }} />}
    </div>
  );
}
