export interface Set {
  id: number;
  nome: string;
  codigo_liga: string;
}

export interface Card {
  id: number;
  nome: string;
  numero: number;
  total_set: number;
  numero_completo: string;
  raridade: string | null;
  preco_min: string | null;
  preco_med: string | null;
  preco_max: string | null;
  imagem: string | null;
  set: Set;
}
