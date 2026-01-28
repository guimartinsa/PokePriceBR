export interface CardAutocomplete {
  id: number;
  nome: string;
  numero_completo: string;
  imagem?: string | null;
  set: {
    codigo_liga: string;
  };
}
