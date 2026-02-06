export type PokemonCardItem = {
  id: number;
  name: string;
  imageUrl: string | null;
  types: string[];
  generation: { id: number; name: string } | null;
};
