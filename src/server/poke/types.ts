export type NamedApiResource = { name: string; url: string };

export type PokemonListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedApiResource[];
};

export type GenerationResponse = {
  id: number;
  name: string;
  pokemon_species: NamedApiResource[];
};

export type PokemonResponse = {
  id: number;
  name: string;
  types: Array<{ slot: number; type: NamedApiResource }>;
  stats: Array<{ base_stat: number; stat: NamedApiResource }>;
  sprites: {
    front_default: string | null;
    other?: {
      home?: { front_default: string | null };
      "official-artwork"?: { front_default: string | null };
    };
  };
};
