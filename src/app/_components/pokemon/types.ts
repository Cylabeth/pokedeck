/*
 * Modelo de datos usado por las cards del listado:
 * - Representa el shape mínimo necesario para renderizar UI
 * - Evitamos enviar el objeto completo de PokeAPI al cliente
 *   (menos payload, menos acoplamiento)
 */
export type PokemonCardItem = {
  id: number;
  name: string;
  imageUrl: string | null;
  types: string[];
  generation: { id: number; name: string } | null;
};

/*
 * Item básico del índice global:
 * - Usado internamente para construir el universo de búsqueda
 * - Incluye url porque PokeAPI index devuelve name + url
 *   y el id se extrae desde esa url
 */
export type PokemonIndexItem = {
  id: number;
  name: string;
  url: string;
};


