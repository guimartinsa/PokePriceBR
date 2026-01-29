/*
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchCards } from "../api/cards";
import type { Card } from "../types/Card";
import { CardGrid } from "./cards/CardGrid";
import { SetAutocomplete } from "./SetAutocomplete";
import { CardAutocomplete } from "./CardAutocomplete";
import { useDebounce } from "../hooks/useDebounce";
import { Loading } from "./Loading";

import "./style.css";

type Filters = {
  nome: string;
  set: string;
  raridade: string;
};

export default function CardList() {
  const [searchParams] = useSearchParams();
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

  /* ======================
     RESET quando filtro muda
  ====================== 
  useEffect(() => {
    setCards([]);
    setPage(1);
    setHasMore(true);
  }, [debounceFilters]);

  /* ======================
     FETCH
  ====================== 
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
  }, [page, debounceFilters, hasMore, loading]);

  /* ======================
     INTERSECTION OBSERVER
  ====================== 
  useEffect(() => {
    if (!hasMore || loading) return;

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
      if (el) observer.disconnect();
    };
  }, [hasMore, loading]);

  /* ======================
     UI
  ====================== 
  return (
    <div style={{ padding: 16 }}>
      <h1>Cartas</h1>

      {/* FILTROS }
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
        <CardAutocomplete
          value={filters.nome || ""}
          onSelect={(nome) => setFilters((f) => ({ ...f, nome }))}
        />

        <SetAutocomplete
          value={filters.set}
          onChange={(value) => setFilters((f) => ({ ...f, set: value }))}
        />
      </div>

      {/* LISTA usando CardGrid }
      <CardGrid cards={cards} />

      {error && <p style={{ color: "red", textAlign: "center" }}>{error}</p>}

      {/* LOADING }
      {loading && <Loading />}

      {/* SENTINELA }
      {hasMore && <div ref={loadMoreRef} style={{ height: 40 }} />}
    </div>
  );
}
*/

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchCards } from "../api/cards";
import type { Card } from "../types/Card";
import { CardGrid } from "./cards/CardGrid";
import { Loading } from "./Loading";
import { SearchFilters, type SearchFiltersState } from "./filters/Searchfilters";
import { useDebounce } from "../hooks/useDebounce";

//import "./style.css";
import "../styles/global.css";

export  function CardList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const [cards, setCards] = useState<Card[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [filters, setFilters] = useState<SearchFiltersState>({
    nome: searchParams.get("nome") || "",
    set: searchParams.get("set") || "",
    raridade: searchParams.get("raridade") || "",
    ilustrador: searchParams.get("ilustrador") || "",
    over: searchParams.get("over")
      ? searchParams.get("over") === "true"
      : null,
    preco_min: searchParams.get("preco_min") || "",
    preco_max: searchParams.get("preco_max") || "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const debounceFilters = useDebounce(filters, 400);

  /* ======================
     ATUALIZAR URL com filtros
  ====================== */
  useEffect(() => {
    const params: any = {};

    if (filters.nome) params.nome = filters.nome;
    if (filters.set) params.set = filters.set;
    if (filters.raridade) params.raridade = filters.raridade;
    if (filters.ilustrador) params.ilustrador = filters.ilustrador;
    if (filters.over !== null) params.over = String(filters.over);
    if (filters.preco_min) params.preco_min = filters.preco_min;
    if (filters.preco_max) params.preco_max = filters.preco_max;

    setSearchParams(params);
  }, [filters, setSearchParams]);

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
      // 🆕 NOVOS FILTROS
      ilustrador: debounceFilters.ilustrador || undefined,
      over: debounceFilters.over !== null ? debounceFilters.over : undefined,
      preco_min: debounceFilters.preco_min || undefined,
      preco_max: debounceFilters.preco_max || undefined,
    })
      .then((data) => {
        setCards((prev) =>
          page === 1 ? data.results : [...prev, ...data.results]
        );

        setHasMore(Boolean(data.next));
      })
      .catch(() => setError("Erro ao carregar cartas"))
      .finally(() => setLoading(false));
  }, [page, debounceFilters, hasMore, loading]);

  /* ======================
     INTERSECTION OBSERVER
  ====================== */
  useEffect(() => {
    if (!hasMore || loading) return;

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
      if (el) observer.disconnect();
    };
  }, [hasMore, loading]);

  /* ======================
     UI
  ====================== */
  return (
    <div style={{ padding: 16, maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ marginBottom: "20px" }}>🃏 Cartas Pokémon</h1>

      {/* 🆕 PAINEL DE FILTROS COMPLETO */}
      <SearchFilters filters={filters} onChange={setFilters} />

      {/* ESTATÍSTICAS */}
      {cards.length > 0 && !loading && (
        <p
          style={{
            marginBottom: "16px",
            color: "#666",
            fontSize: "14px",
          }}
        >
          {cards.length} carta{cards.length !== 1 ? "s" : ""} encontrada
          {cards.length !== 1 ? "s" : ""}
          {hasMore && " (carregue mais para ver todas)"}
        </p>
      )}

      {/* LISTA usando CardGrid */}
      <CardGrid cards={cards} />

      {error && (
        <p style={{ color: "red", textAlign: "center", marginTop: "20px" }}>
          {error}
        </p>
      )}

      {/* LOADING */}
      {loading && <Loading />}

      {/* SENTINELA */}
      {hasMore && !loading && <div ref={loadMoreRef} style={{ height: 40 }} />}

      {/* MENSAGEM DE FIM */}
      {!hasMore && cards.length > 0 && (
        <p
          style={{
            textAlign: "center",
            color: "#999",
            marginTop: "32px",
            padding: "20px",
          }}
        >
          ✨ Você viu todas as cartas!
        </p>
      )}
    </div>
  );
}