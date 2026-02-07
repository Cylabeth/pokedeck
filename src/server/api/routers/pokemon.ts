import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { createPool } from "~/server/poke/concurrency";
import { fetchJson } from "~/server/poke/pokeApiClient";
import { getPokemonImageUrl } from "~/server/poke/image";
import type {
  EvolutionChainResponse,
  EvolutionChainNode ,
  GenerationResponse,
  PokemonListResponse,
  PokemonResponse,
  PokemonSpeciesResponse,
  TypeListResponse,
  TypeResponse,
} from "~/server/poke/types";


const TTL_LONG = 1000 * 60 * 60 * 12; // 12h
const TTL_VERY_LONG = 1000 * 60 * 60 * 24; // 24h
const EXPAND_MAX = 24;

const pool = createPool(10);
const ID_FROM_URL_RE = /\/(\d+)\/?$/;


function extractIdFromUrl(url: string): number {
  const res = ID_FROM_URL_RE.exec(url);
  if (!res?.[1]) throw new Error(`Cannot extract id from url: ${url}`);
  return Number(res[1]);
}

function parseMaybeIdFromQuery(q: string): number | null {
  const cleaned = q.replace(/^#/, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}
/*
async function expandEvolutionNames(baseNames: string[]): Promise<string[]> {
  // defensivo: si alguien busca "a", no vamos a expandir 400 cadenas
  const unique = [...new Set(baseNames)].slice(0, 10);

  const results = await Promise.all(
    unique.map((name) =>
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

  return [...new Set(results.flat())];
}
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

          // 2) ahora sí species + evolution chain
          const species = await fetchJson<PokemonSpeciesResponse>(
            `/pokemon-species/${speciesName}`,
            { ttlMs: TTL_LONG, retryOnce: true },
          );

          const chain = await fetchJson<EvolutionChainResponse>(
            species.evolution_chain.url,
            { ttlMs: TTL_VERY_LONG, retryOnce: true },
          );

          return flattenEvolutionChain(chain.chain);
        } catch {
          // ✅ tolerancia a fallos parciales: si una variante rara falla,
          // no tiramos abajo todo el search.
          return [name];
        }
      }),
    ),
  );

  return [...new Set(results.flat())];
}



async function getPokemonIdsByType(typeName: string): Promise<Set<number>> {
  const res = await fetchJson<TypeResponse>(`/type/${typeName}`, {
    ttlMs: TTL_VERY_LONG,
    retryOnce: true,
  });

  const ids = res.pokemon.map((p) => extractIdFromUrl(p.pokemon.url));
  return new Set(ids);
}


async function getPokemonIndexAll() {
  return fetchJson<PokemonListResponse>("/pokemon?limit=100000&offset=0", { ttlMs: TTL_LONG });
}

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

const SearchInput = z.object({
  q: z.string().optional().default(""),
  generation: z.string().nullable().optional().default(null),
  type: z.string().nullable().optional().default(null),
  cursor: z.number().int().min(0).optional().default(0),
  limit: z.number().int().min(1).max(24).optional().default(24),
});


export const pokemonRouter = createTRPCRouter({
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
            const generation = generationsByName[p.name] ?? null;

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

    // 1) filter by generation (global, cheap)
    let filtered = all;
    if (input.generation) {
      filtered = filtered.filter((p) => generationsByName[p.name]?.name === input.generation);
    }


// 2) filter by query (name or #id) + evolutions
if (q) {
  const maybeId = parseMaybeIdFromQuery(q);

  if (maybeId !== null) {
    // id exacto
    filtered = filtered.filter((p) => p.id === maybeId);

    // (Opcional) si querés que por id también incluya evoluciones:
     const baseNames = filtered.map((p) => p.name);
     const expanded = await expandEvolutionNames(baseNames);
     const expandedSet = new Set(expanded);
     filtered = filtered.filter((p) => expandedSet.has(p.name));
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


    // 3) filter by type (global)
    if (input.type && filtered.length > 0) {
      const idsByType = await getPokemonIdsByType(input.type);
      filtered = filtered.filter((p) => idsByType.has(p.id));
    }


    // paginate names
    const page = filtered.slice(cursor, cursor + limit).map((p) => p.name);

    // hydrate
    const items = page.length
      ? await (async () => {
          const gens = generationsByName;
          const res = await Promise.all(
            page.map((name) =>
              pool(async () => {
                const p = await fetchJson<PokemonResponse>(`/pokemon/${name}`, { ttlMs: TTL_LONG });
                const generation = gens[p.name] ?? null;
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

});

