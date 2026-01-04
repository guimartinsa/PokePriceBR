import { api } from "./api";
import type { Card } from "../types/Card";

export async function fetchCardsAutocomplete(search: string): Promise<Card[]> {
  if (!search || search.length < 2) return [];

  const res = await api.get("/cards/", {
    params: {
      search,
      page: 1,
    },
  });

  // só os primeiros resultados (UX)
  return res.data.results.slice(0, 6);
}
