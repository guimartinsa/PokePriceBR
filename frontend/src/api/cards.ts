import { api } from "./api";
import type { Card } from "../types/Card";
import type { PaginatedResponse } from "../types/PaginatedResponse";

export interface CardFilters {
  page?: number;
  nome?: string;
  set?: string;
  raridade?: string;
  over?: boolean;
  // 🆕 NOVOS FILTROS
  ilustrador?: string;
  numero?: string;
  preco_min?: string;
  preco_max?: string;
  ordenar?: string;
}

export const fetchCards = async (filters: CardFilters) => {
  const params: any = { ...filters };

  if (filters.over !== undefined) {
    params.over = filters.over ? "true" : "false";
  }

  const response = await api.get<PaginatedResponse<Card>>("/cards/", {
    params,
  });

  return response.data;
};