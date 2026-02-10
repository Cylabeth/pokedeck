/*
 * Tipo parcial de sprites que usamos:
 * No importamos todo el objeto de sprites de PokeAPI porque es enorme;
 * solo tipamos los campos que realmente necesitamos.
 */
export type PokemonSprites = {
  front_default?: string | null;
  other?: {
    home?: { front_default?: string | null } | null;
    "official-artwork"?: { front_default?: string | null } | null;
  } | null;
};

/*
 * getPokemonImageUrl:
 *
 * PokeAPI expone múltiples fuentes de imágenes con distintas resoluciones.
 * Elegimos una estrategia de fallback para asegurar que SIEMPRE exista imagen:
 *
 * Prioridad:
 * 1) official-artwork  → mejor calidad (preferido para UI principal)
 * 2) home              → buena calidad alternativa
 * 3) front_default     → sprite clásico pequeño (último fallback)
 *
 * Esto evita que la UI quede con imágenes rotas cuando algún campo no existe.
 */
export function getPokemonImageUrl(sprites?: PokemonSprites | null): string | null {
  return (
    sprites?.other?.["official-artwork"]?.front_default ??
    sprites?.other?.home?.front_default ??
    sprites?.front_default ??
    null
  );
}
