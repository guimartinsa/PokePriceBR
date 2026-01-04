import { api } from "./api";

export type SetOption = {
  id: number;
  nome: string;
  codigo: string;
};

export async function fetchSets(query: string): Promise<SetOption[]> {
  if (!query || query.length < 2) return [];

  const res = await api.get<SetOption[]>("/sets/", {
    params: { q: query },
  });

  return res.data;
}
