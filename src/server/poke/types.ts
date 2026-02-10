
/*
 * Tipos (parciales) de PokeAPI:
 * - PokeAPI devuelve objetos MUY grandes.
 * - Para la prueba, tipamos solo los campos que realmente consumimos en el BFF.
 * - Ventaja: mejor DX (autocompletado + seguridad) sin sobre-modelar la API.
 */

export type NamedApiResource = { name: string; url: string };

/*
 * /pokemon?limit=... devuelve el índice global:
 * - results: [{ name, url }]
 * - url incluye el id, que extraemos con regex para ordenar/buscar sin más llamadas.
 */
export type PokemonListResponse = {
  count: number;
  next: string | null;
  previous: string | null;
  results: NamedApiResource[];
};

/*
 * /generation/{id}:
 * - pokemon_species trae la lista de especies de esa generación.
 * - Lo usamos para construir un índice "speciesName -> generation" (lookup O(1)).
 */
export type GenerationResponse = {
  id: number;
  name: string;
  pokemon_species: NamedApiResource[];
};

/*
 * /pokemon/{nameOrId}:
 * - Base para hydrate y detail.
 * - species: clave para resolver generation y para pedir /pokemon-species.
 * - types/stats: datos que mostramos.
 * - sprites: de aquí sale la imagen (con fallback en getPokemonImageUrl).
 */
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

/*
 * /pokemon-species/{speciesName}:
 * - evolution_chain.url: para pedir /evolution-chain/{id}.
 * - flavor_text_entries / genera: texto descriptivo del detalle.
 *
 * Edge case real (que encontraste en producción durante la prueba):
 * - Algunas "species" NO tienen endpoint directo /pokemon/{speciesName}
 *   (ej: wormadam), y solo existen sus varieties:
 *   wormadam-plant / wormadam-sandy / wormadam-trash.
 * - Por eso añadimos varieties: para poder elegir el "default variety"
 *   al hidratar evoluciones en el endpoint detail.
 */
export type PokemonSpeciesResponse = {
  evolution_chain: { url: string };
  flavor_text_entries?: Array<{
    flavor_text: string;
    language: NamedApiResource;
    version?: NamedApiResource;
  }>;
  genera?: Array<{ genus: string; language: NamedApiResource }>;

  // Algunas especies (ej: wormadam) no tienen un /pokemon/{speciesName},
  // solo existen sus varieties (wormadam-plant, wormadam-sandy, etc.)
  varieties?: Array<{
    is_default: boolean;
    pokemon: NamedApiResource;
  }>;
};

/*
 * /evolution-chain/{id}:
 * - chain es un árbol n-ario (cada nodo puede evolucionar a varios).
 * - Luego lo "aplanamos" con flattenEvolutionChain para usarlo en search/detail.
 */
export type EvolutionChainNode = {
  species: NamedApiResource;
  evolves_to: EvolutionChainNode[];
};

export type EvolutionChainResponse = {
  id: number;
  chain: EvolutionChainNode;
};

/*
 * /type lista tipos disponibles (results name/url).
 */
export type TypeListResponse = {
  results: NamedApiResource[];
};


/*
 * /type/{typeName} devuelve pokemons asociados a ese tipo:
 * - Lo usamos para filtrar: convertimos urls -> ids y armamos un Set para lookup rápido.
 */
export type TypeResponse = {
  pokemon: Array<{
    pokemon: NamedApiResource; // name + url
    slot: number;
  }>;
};

