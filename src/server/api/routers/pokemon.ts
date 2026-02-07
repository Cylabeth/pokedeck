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
});

