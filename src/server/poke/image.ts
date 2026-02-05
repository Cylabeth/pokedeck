export type PokemonSprites = {
  front_default?: string | null;
  other?: {
    home?: { front_default?: string | null } | null;
    "official-artwork"?: { front_default?: string | null } | null;
  } | null;
};

export function getPokemonImageUrl(sprites?: PokemonSprites | null): string | null {
  return (
    sprites?.other?.["official-artwork"]?.front_default ??
    sprites?.other?.home?.front_default ??
    sprites?.front_default ??
    null
  );
}
