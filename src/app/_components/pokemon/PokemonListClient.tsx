"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { PokemonCard } from "./PokemonCard";
import type { PokemonCardItem, PokemonIndexItem } from "./types";

const PAGE_SIZE = 24;

function normalizeQuery(raw: string) {
  return raw.trim().toLowerCase();
}

function parseMaybeId(q: string): number | null {
  // soporta "25" o "#25" o "025"
  const cleaned = q.replace(/^#/, "");
  if (!/^\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

export function PokemonListClient(props: {
  initialIndex: PokemonIndexItem[];
  initialCards: PokemonCardItem[];
}) {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const normalized = useMemo(() => normalizeQuery(debounced), [debounced]);
  const maybeId = useMemo(() => parseMaybeId(normalized), [normalized]);

  // Filtrado GLOBAL sobre el índice
  const filteredNames = useMemo(() => {
    if (!normalized) return props.initialIndex.map((p) => p.name);

    // Si es número, filtramos por id exacto
    if (maybeId !== null) {
      const hit = props.initialIndex.find((p) => p.id === maybeId);
      return hit ? [hit.name] : [];
    }

    return props.initialIndex
      .filter((p) => p.name.includes(normalized))
      .map((p) => p.name);
  }, [normalized, maybeId, props.initialIndex]);

  // Por ahora: mostramos solo un “page” de results
  const visibleNames = useMemo(
    () => filteredNames.slice(0, PAGE_SIZE),
    [filteredNames],
  );

  // Hidratamos lo visible (BFF)
  const hydrateQuery = api.pokemon.hydrate.useQuery(
    { names: visibleNames },
    {
      // Si no hay resultados, no queremos hacer query “dummy”
      enabled: visibleNames.length > 0,
      // Como ya tenemos SSR, evita refetch innecesario inmediato
      staleTime: 30_000,
    },
  );

  {/*const cards = visibleNames.length > 0 ? hydrateQuery.data ?? [] : []; */}
  const hasQuery = normalized.length > 0;

  // Si NO hay búsqueda, preferimos mostrar SSR mientras TanStack termina de hidratar.
  const cards: PokemonCardItem[] = hasQuery
    ? hydrateQuery.data ?? []
    : hydrateQuery.data ?? props.initialCards;



  return (
    <div className="space-y-6">
      {/* Search bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-card-soft">
          <span className="text-black/40">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number"
            className="w-full bg-transparent outline-none"
          />
        </div>

        {/* Placeholder del botón filtros, lo cableamos en paso filtros */}
        <button
          type="button"
          className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-semibold text-black/70 shadow-card-soft"
          disabled
          title="Filters (coming next)"
        >
          ☰ Filters
        </button>

        <div className="ml-auto text-sm text-black/60">
          Sorted by <span className="font-medium text-black/80">id</span>
        </div>
      </div>

      {/* States */}
      {normalized && filteredNames.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          No Pokémon match “{debounced}”.
        </div>
      ) : hydrateQuery.isLoading && hasQuery ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          Loading Pokémon…
        </div>
      ) : hydrateQuery.isError ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          Something went wrong loading Pokémon.
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((p) => (
            <PokemonCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

