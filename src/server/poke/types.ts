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
  species: NamedApiResource;
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

export type PokemonSpeciesResponse = {
  evolution_chain: { url: string };
};

export type EvolutionChainNode = {
  species: NamedApiResource;
  evolves_to: EvolutionChainNode[];
};

export type EvolutionChainResponse = {
  id: number;
  chain: EvolutionChainNode;
};

export type TypeListResponse = {
  results: NamedApiResource[];
};

export type TypeResponse = {
  pokemon: Array<{
    pokemon: NamedApiResource; // name + url
    slot: number;
  }>;
};
