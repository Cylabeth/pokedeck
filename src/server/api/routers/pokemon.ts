import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createPool } from "~/server/poke/concurrency";
import { fetchJson } from "~/server/poke/pokeApiClient";
import { getPokemonImageUrl } from "~/server/poke/image";
import type {
  EvolutionChainResponse,
  EvolutionChainNode,
  GenerationResponse,
  PokemonListResponse,
  PokemonResponse,
  PokemonSpeciesResponse,
  TypeListResponse,
  TypeResponse,
} from "~/server/poke/types";


/*
 * Caching en memoria (scope de la prueba):
 * - PokeAPI es pública y puede rate-limitear, así que cacheamos respuestas para no repetir llamadas.
 * - TTL_LONG: endpoints que se repiten durante uso normal (pokemon, listados grandes).
 * - TTL_VERY_LONG: datos “casi estáticos” (types, generations, evolution chains).
 * En un producto real, este cache se movería a Redis/CDN, pero para la prueba mantenemos in-memory.
 */

const TTL_LONG = 1000 * 60 * 60 * 12; // 12h
const TTL_VERY_LONG = 1000 * 60 * 60 * 24; // 24h

/*
 * Límite defensivo para expansión de evoluciones:
 * Evita que una búsqueda muy amplia dispare demasiadas llamadas (p.ej. búsquedas genéricas).
 * Nota: aunque el endpoint admite hasta 24 nombres, la función interna recorta a 10 para controlar coste
 */
const EXPAND_MAX = 24;

/*
 * Pool de concurrencia:
 * - PokeAPI tiene límites; si disparamos 200 fetch en paralelo, aparecen 429/500 intermitentes.
 * - Este pool mantiene “un techo” de concurrencia y estabiliza la app.
 */
const pool = createPool(10);

/*
 * PokeAPI devuelve urls del tipo ".../pokemon/25/" => extraemos el id con regex.
 * Esto nos permite ordenar y buscar sin llamadas extra.
 */
const ID_FROM_URL_RE = /\/(\d+)\/?$/;


function extractIdFromUrl(url: string): number {
  const res = ID_FROM_URL_RE.exec(url);
  if (!res?.[1]) throw new Error(`Cannot extract id from url: ${url}`);
  return Number(res[1]);
}

/*
 * Si el usuario busca "#25" o "25", interpretamos búsqueda por id.
 * Si no es numérico, lo tratamos como búsqueda por texto (nombre).
 */
function parseMaybeIdFromQuery(q: string): number | null {
  const cleaned = q.replace(/^#/, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/*
 * Expansión de evoluciones (requisito del enunciado):
 * - La búsqueda debe incluir cadena evolutiva: "pikachu" => "pichu/pikachu/raichu".
 * - Se hace server-side (BFF) para que:
 *    1) se aplique de forma consistente junto con filtros (generación/tipo)
 *    2) evitemos lógica duplicada en el cliente
 *
 * Importante (edge case de PokeAPI):
 * - Hay “forms/variants” que existen en /pokemon/{name} pero NO en /pokemon-species/{name}.
 *   Por eso resolvemos primero la species “canónica” desde /pokemon/{name} y recién después
 *   consultamos /pokemon-species y la evolution chain.
 *
 * Defensivo:
 * - De-duplicamos nombres y limitamos a 10 para evitar explosión de requests.
 * - Si una expansión falla por algún caso raro, devolvemos [name] y no rompemos el search entero.
 */
async function expandEvolutionNames(baseNames: string[]): Promise<string[]> {
  // defensivo
  const unique = [...new Set(baseNames)].slice(0, 10);

  const results = await Promise.all(
    unique.map((name) =>
      pool(async () => {
        try {
          // 1) resolvemos species canonical desde /pokemon/{name}
          const p = await fetchJson<PokemonResponse>(`/pokemon/${name}`, {
            ttlMs: TTL_LONG,
            retryOnce: true,
          });

          const speciesName = p.species?.name ?? name;

          // 2) /pokemon-species/{speciesName} -> tiene evolution_chain.url
          const species = await fetchJson<PokemonSpeciesResponse>(
            `/pokemon-species/${speciesName}`,
            { ttlMs: TTL_LONG, retryOnce: true },
          );

          // 3) /evolution-chain/{id} -> árbol evolutivo, lo aplanamos a lista de nombres
          const chain = await fetchJson<EvolutionChainResponse>(
            species.evolution_chain.url,
            { ttlMs: TTL_VERY_LONG, retryOnce: true },
          );

          return flattenEvolutionChain(chain.chain);
        } catch {
          // tolerancia a fallos parciales: si una variante rara falla,
          // no tiramos abajo todo el search.
          return [name];
        }
      }),
    ),
  );

  return [...new Set(results.flat())];
}

/*
 * Filtro por tipo:
 * - PokeAPI no permite filtrar /pokemon directamente por type.
 * - Usamos /type/{typeName} que trae una lista de pokemons con url, de ahí extraemos ids.
 * - Devolvemos Set para lookup O(1).
 */
async function getPokemonIdsByType(typeName: string): Promise<Set<number>> {
  const res = await fetchJson<TypeResponse>(`/type/${typeName}`, {
    ttlMs: TTL_VERY_LONG,
    retryOnce: true,
  });

  const ids = res.pokemon.map((p) => extractIdFromUrl(p.pokemon.url));
  return new Set(ids);
}

/*
 * Índice global de pokemons (name + url/id):
 * - /pokemon?limit=100000 nos da el índice rápido.
 * - Luego hidratamos solo lo que vamos a mostrar (paginación).
 */
async function getPokemonIndexAll() {
  return fetchJson<PokemonListResponse>("/pokemon?limit=100000&offset=0", { ttlMs: TTL_LONG });
}

/*
 * Índice de generaciones por species.name:
 * - La generación no viene en /pokemon directamente.
 * - Precargamos generaciones 1..9 y construimos un map name -> generation para lookup O(1).
 * - Esto evita N+1 y hace que search/hydrate/detail puedan resolver generation sin más llamadas.
 */
async function getGenerationsIndexBySpeciesName() {
  // Gen I..IX currently; we can probe 1..15 and stop on 404, but keep it simple for challenge.
  const genIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const gens = await Promise.all(
    genIds.map((id) =>
      fetchJson<GenerationResponse>(`/generation/${id}`, { ttlMs: TTL_VERY_LONG, retryOnce: true }),
    ),
  );

  const map: Record<string, { id: number; name: string }> = {};

  for (const g of gens) {
    for (const s of g.pokemon_species) {
      map[s.name] = { id: g.id, name: g.name };
    }
  }

  return map;
}

/*
 * Lista de tipos para filtros del UI:
 * - Excluimos "unknown" y "shadow" porque no son tipos “clásicos” en el filtro.
 */
async function getTypesList(): Promise<string[]> {
  const res = await fetchJson<TypeListResponse>("/type", {
    ttlMs: TTL_VERY_LONG,
    retryOnce: true,
  });

  return res.results
    .map((t) => t.name)
    // opcional: excluir tipos raros que no son “pokemon types” clásicos
    .filter((t) => t !== "unknown" && t !== "shadow")
    .sort((a, b) => a.localeCompare(b));
}


/*
 * Lista de generaciones para el UI:
 * - La UI necesita mostrar nombres/ids de generación para filtrar.
 */
async function getGenerationsList(): Promise<Array<{ id: number; name: string }>> {
  const genIds = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  const gens = await Promise.all(
    genIds.map((id) =>
      fetchJson<GenerationResponse>(`/generation/${id}`, {
        ttlMs: TTL_VERY_LONG,
        retryOnce: true,
      }),
    ),
  );

  return gens.map((g) => ({ id: g.id, name: g.name })).sort((a, b) => a.id - b.id);
}

/*
 * PokeAPI devuelve evoluciones como árbol (n-ario).
 * Esta función lo aplana a lista de nombres (sin duplicados).
 */
function flattenEvolutionChain(root: EvolutionChainNode): string[] {
  const out: string[] = [];
  const stack: EvolutionChainNode[] = [root];

  while (stack.length) {
    const node = stack.pop();
    if (node === undefined) continue;

    out.push(node.species.name);

    const next = node.evolves_to ?? [];
    for (let i = next.length - 1; i >= 0; i--) stack.push(next[i]!);
  }

  return [...new Set(out)];
}


/*
 * Input de búsqueda (server-side):
 * - cursor/limit para paginación
 * - generation/type para filtros
 * - q para búsqueda por nombre o id (#25)
 */
const SearchInput = z.object({
  q: z.string().optional().default(""),
  generation: z.string().nullable().optional().default(null),
  type: z.string().nullable().optional().default(null),
  cursor: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(24).optional().default(24),
});


export const pokemonRouter = createTRPCRouter({
  /*
   * Índice completo (id + name):
   * - Útil para construir el “universo” base y evitar llamadas repetidas.
   */
  indexAll: publicProcedure.query(async () => {
    const res = await getPokemonIndexAll();
    return res.results
      .map((r) => ({ ...r, id: extractIdFromUrl(r.url) }))
      .sort((a, b) => a.id - b.id);
  }),

  generationsIndex: publicProcedure.query(async () => {
    return getGenerationsIndexBySpeciesName();
  }),

  typesList: publicProcedure.query(async () => {
    return getTypesList();
  }),

  generationsList: publicProcedure.query(async () => {
    return getGenerationsList();
  }),


  /*
   * Hydrate:
   * - Dado un array de nombres, traemos los datos “presentables” (id, imagen, tipos, generación).
   * - La generación se resuelve por species.name (no por p.name) para ser robustos con variants.
   */
  hydrate: publicProcedure
    .input(
      z.object({
        names: z.array(z.string().min(1)).min(1).max(40),
      }),
    )
    .query(async ({ input }) => {
      const generationsByName = await getGenerationsIndexBySpeciesName();

      const items = await Promise.all(
        input.names.map((name) =>
          pool(async () => {
            const p = await fetchJson<PokemonResponse>(`/pokemon/${name}`, {
              ttlMs: TTL_LONG,
            });
            const generation = generationsByName[p.species?.name ?? p.name] ?? null;

            return {
              id: p.id,
              name: p.name,
              imageUrl: getPokemonImageUrl(p.sprites),
              types: p.types
                .slice()
                .sort((a, b) => a.slot - b.slot)
                .map((t) => t.type.name),
              generation,
            };
          }),
        ),
      );

      items.sort((a, b) => a.id - b.id);
      return items;
    }),


  /*
   * Expand evolutions (endpoint auxiliar):
   * - Dado un conjunto de nombres, devuelve el conjunto expandido con evoluciones.
   * - Usamos Promise.allSettled para que un fallo puntual no rompa toda la respuesta.
   * - En dev, logueamos si hubo fallos para depuración sin ensuciar UX en prod.
   */
  expandEvolutions: publicProcedure
    .input(
      z.object({
        names: z.array(z.string().min(1)).min(1).max(EXPAND_MAX),
      }),
    )
    .query(async ({ input }) => {
      const settled = await Promise.allSettled(
        input.names.map((name) =>
          pool(async () => {
            const species = await fetchJson<PokemonSpeciesResponse>(
              `/pokemon-species/${name}`,
              { ttlMs: TTL_LONG, retryOnce: true },
            );

            const chain = await fetchJson<EvolutionChainResponse>(
              species.evolution_chain.url,
              { ttlMs: TTL_VERY_LONG, retryOnce: true },
            );

            return flattenEvolutionChain(chain.chain);
          }),
        ),
      );

      const results = settled
        .filter((r): r is PromiseFulfilledResult<string[]> => r.status === "fulfilled")
        .map((r) => r.value);

      if (process.env.NODE_ENV === "development") {
        const failed = settled.filter((r) => r.status === "rejected").length;
        if (failed > 0) console.warn(`[expandEvolutions] ${failed} failed expansions`);
      }



      const expandedNames = [...new Set(results.flat())];
      return { expandedNames };
    }),


  /*
   * Search server-side (realtime):
   * - Requisito: buscar por nombre e incluir cadena evolutiva.
   * - También soporta búsqueda por id (#25 / 25).
   * - Todo ocurre en el BFF para mantener consistencia con filtros (tipo/generación) y paginación.
   *
   * Estrategia:
   * 1) Partimos del índice completo (id+name)
   * 2) Aplicamos filtros globales (generation, luego q, luego type)
   * 3) Paginamos por nombre
   * 4) Hydratamos solo la página visible (evitamos N+1 masivo)
   */
  search: publicProcedure.input(SearchInput).query(async ({ input }) => {
    const q = input.q.trim().toLowerCase();
    const cursor = input.cursor ?? 0;
    const limit = input.limit ?? 24;

    const index = await getPokemonIndexAll();
    const generationsByName = await getGenerationsIndexBySpeciesName();

    // base list: id+name sorted
    const all = index.results
      .map((r) => ({ name: r.name, id: extractIdFromUrl(r.url) }))
      .sort((a, b) => a.id - b.id);

    // 1) Filtro por generación (reduce universo y hace que el resto sea más eficiente)
    let filtered = all;
    if (input.generation) {
      filtered = filtered.filter((p) => generationsByName[p.name]?.name === input.generation);
    }


    // 2) Query:
    // - Si es numérica: buscamos el hit exacto por id y expandimos evoluciones desde su nombre.
    // - Si es texto: buscamos coincidencias por substring y expandimos evoluciones desde esos matches
    if (q) {
      const maybeId = parseMaybeIdFromQuery(q);

      if (maybeId !== null) {

        const hit = filtered.find((p) => p.id === maybeId);

        if (!hit) {
          filtered = [];
        } else {
          // expandimos desde el nombre del hit (hit + evoluciones)
          const expanded = await expandEvolutionNames([hit.name]);
          const expandedSet = new Set(expanded);

          filtered = filtered.filter((p) => expandedSet.has(p.name));
        }
      } else {
        // matches directos (sobre el universo ACTUAL: respeta generation)
        const directMatches = filtered
          .filter((p) => p.name.includes(q))
          .map((p) => p.name);

        if (directMatches.length > 0) {
          const expanded = await expandEvolutionNames(directMatches);
          const expandedSet = new Set(expanded);

          // quedate SOLO con los que estén en la expansión (y que ya respeten generation)
          filtered = filtered.filter((p) => expandedSet.has(p.name));
        } else {
          filtered = [];
        }
      }
    }


    // 3) Filtro por tipo (aplicado al conjunto resultante; usa Set para lookup rápido)
    if (input.type && filtered.length > 0) {
      const idsByType = await getPokemonIdsByType(input.type);
      filtered = filtered.filter((p) => idsByType.has(p.id));
    }


    // 4) Paginación (por nombres) + hydrate de la página visible
    const page = filtered.slice(cursor, cursor + limit).map((p) => p.name);

    // hydrate
    const items = page.length
      ? await (async () => {
        const gens = generationsByName;
        const res = await Promise.all(
          page.map((name) =>
            pool(async () => {
              const p = await fetchJson<PokemonResponse>(`/pokemon/${name}`, { ttlMs: TTL_LONG });
              const generation = gens[p.species?.name ?? p.name] ?? null;
              return {
                id: p.id,
                name: p.name,
                imageUrl: getPokemonImageUrl(p.sprites),
                types: p.types
                  .slice()
                  .sort((a, b) => a.slot - b.slot)
                  .map((t) => t.type.name),
                generation,
              };
            }),
          ),
        );
        res.sort((a, b) => a.id - b.id);
        return res;
      })()
      : [];

    const nextCursor = cursor + limit < filtered.length ? cursor + limit : null;

    return {
      items,
      nextCursor,
      total: filtered.length,
    };
  }),

  /*
   * Detail:
   * - Centralizado en BFF para:
   *   1) reutilizar pool + cache
   *   2) normalizar datos (imagen, tipos, flavorText, evoluciones)
   *   3) cubrir edge-cases reales de PokeAPI (species sin /pokemon directo)
   */
  detail: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .query(async ({ input }) => {
      const generationsByName = await getGenerationsIndexBySpeciesName();

      // 1) Base pokemon (permite forms)
      const p = await fetchJson<PokemonResponse>(`/pokemon/${input.name}`, {
        ttlMs: TTL_LONG,
        retryOnce: true,
      });
      const generation = generationsByName[p.species.name] ?? null;

      // 2) Species (texto + evolution url)
      const species = await fetchJson<PokemonSpeciesResponse>(
        `/pokemon-species/${p.species.name}`,
        { ttlMs: TTL_LONG, retryOnce: true },
      );

      // English flavor text (si existe)
      const flavorText =
        species.flavor_text_entries
          ?.find((e) => e.language.name === "en")
          ?.flavor_text?.replace(/\s+/g, " ")
          ?.trim() ?? null;

      const genus =
        species.genera?.find((g) => g.language.name === "en")?.genus ?? null;

      // 3) Evolution chain -> flatten names (species names)
      const chain = await fetchJson<EvolutionChainResponse>(
        species.evolution_chain.url,
        { ttlMs: TTL_VERY_LONG, retryOnce: true },
      );

      const evoNames = flattenEvolutionChain(chain.chain);

      /*
       * Hydrate de evoluciones:
       * - Normalmente /pokemon/{speciesName} existe.
       * - Pero hay casos como "wormadam" donde /pokemon/wormadam da 404 y solo existen variedades:
       *   wormadam-plant / wormadam-sandy / wormadam-trash.
       * - En ese caso pedimos /pokemon-species/{name} y elegimos la variety default para mostrar.
       */
      const evoPokemons = await Promise.all(
        evoNames.slice(0, 20).map((name) =>
          pool(async () => {
            let pokemonName = name;

            let evoP: PokemonResponse | null = null;

            try {
              evoP = await fetchJson<PokemonResponse>(`/pokemon/${pokemonName}`, {
                ttlMs: TTL_LONG,
                retryOnce: true,
              });
            } catch {
              const sp = await fetchJson<PokemonSpeciesResponse>(`/pokemon-species/${name}`, {
                ttlMs: TTL_LONG,
                retryOnce: true,
              });

              const def =
                sp.varieties?.find((v) => v.is_default)?.pokemon.name ??
                sp.varieties?.[0]?.pokemon.name;

              if (def) pokemonName = def;

              evoP = await fetchJson<PokemonResponse>(`/pokemon/${pokemonName}`, {
                ttlMs: TTL_LONG,
                retryOnce: true,
              });
            }

            return {
              id: evoP.id,
              name: evoP.name,
              imageUrl: getPokemonImageUrl(evoP.sprites),
            };
          }),
        ),
      );


      evoPokemons.sort((a, b) => a.id - b.id);

      return {
        id: p.id,
        name: p.name,
        speciesName: p.species.name, // para highlight robusto
        imageUrl: getPokemonImageUrl(p.sprites),
        types: p.types
          .slice()
          .sort((a, b) => a.slot - b.slot)
          .map((t) => t.type.name),
        generation,
        stats: p.stats
          .slice()
          .sort((a, b) => a.stat.name.localeCompare(b.stat.name))
          .map((s) => ({ name: s.stat.name, value: s.base_stat })),
        flavorText,
        genus,
        evolutions: evoPokemons,
      };
    }),
});

