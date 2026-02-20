import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";

import { fetchCards } from "../../api/cards";
import type { Card } from "../../types/Card";
import { CardGrid } from "../../components/cards/CardGrid";
import { Loading } from "../../components/Loading";
import { SearchFilters, type SearchFiltersState } from "../../components/filters/Searchfilters";
import { useDebounce } from "../../hooks/useDebounce";
import { CardQuickViewModal } from "../../components/cards/CardQuickViewModal";

export default function CardListPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    const loadMoreRef = useRef<HTMLDivElement | null>(null);
    const isFetchingRef = useRef(false);


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
    const [selectedCard, setSelectedCard] = useState<Card | null>(null);
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
        if (!hasMore || isFetchingRef.current) return;

        isFetchingRef.current = true;
        setLoading(true);
        setError(null);

        fetchCards({
            page,
            nome: debounceFilters.nome || undefined,
            set: debounceFilters.set || undefined,
            raridade: debounceFilters.raridade || undefined,
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
            .finally(() => {
                isFetchingRef.current = false;
                setLoading(false);
            });
            }, [page, debounceFilters]);

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

            {/* PAINEL DE FILTROS COMPLETO */}
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
            <CardGrid cards={cards} onCardClick={setSelectedCard} />

            {error && (
                <p style={{ color: "red", textAlign: "center", marginTop: "20px" }}>
                    {error}
                </p>
            )}

            {/* LOADING */}
            {loading && <Loading />}

            {/* SENTINELA */}
            {hasMore && !loading && <div ref={loadMoreRef} style={{ height: 40 }} />}

            {selectedCard && (
                <CardQuickViewModal
                    card={selectedCard}
                    open={!!selectedCard}
                    onClose={() => setSelectedCard(null)}
                    showCollectionActions
                />
            )}

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