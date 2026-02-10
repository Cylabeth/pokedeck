"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { PokemonCard } from "./PokemonCard";
import type { PokemonCardItem } from "./types";
import { usePokemonListStore } from "~/app/_components/pokemon/pokemonListStore";
import { formatGenerationName } from "~/app/_lib/pokemonGenerationStyles";

const PAGE_SIZE = 24;

/*
 * Normalizamos la query para que:
 * - sea case-insensitive
 * - no haya búsquedas por " " (espacios)
 * Importante: el backend ya trabaja con q normalizada, pero lo hacemos aquí
 * para que el "enabled" y el debounce reaccionen de forma consistente.
 */
function normalizeQuery(raw: string) {
  return raw.trim().toLowerCase();
}

export function PokemonListClient(props: {
  // los dejamos por SSR fallback
  initialCards: PokemonCardItem[];
}) {
  /*
   * Debounce local:
   * - evita disparar llamadas al backend por cada tecla
   * - mejora UX y reduce carga sobre PokeAPI vía nuestro BFF
   */
  const [debounced, setDebounced] = useState("");

  /*
   * Zustand store:
   * - centraliza filtros, paginación y cache de resultados para poder volver desde detalle
   * - evita perder scroll y estado cuando navegamos
   */
  const query = usePokemonListStore((s) => s.query);
  const selectedType = usePokemonListStore((s) => s.type) ?? "";
  const selectedGen = usePokemonListStore((s) => s.generation) ?? "";
  const cursor = usePokemonListStore((s) => s.cursor);

  const items = usePokemonListStore((s) => s.items);
  const nextCursor = usePokemonListStore((s) => s.nextCursor);

  const setQuery = usePokemonListStore((s) => s.setQuery);
  const setType = usePokemonListStore((s) => s.setType);
  const setGeneration = usePokemonListStore((s) => s.setGeneration);
  const setCursor = usePokemonListStore((s) => s.setCursor);

  const setResults = usePokemonListStore((s) => s.setResults);
  const appendResults = usePokemonListStore((s) => s.appendResults);
  const setInitialSSR = usePokemonListStore((s) => s.setInitialSSR);

  const scrollY = usePokemonListStore((s) => s.scrollY);
  const shouldRestoreScroll = usePokemonListStore((s) => s.shouldRestoreScroll);
  const markRestoreDone = usePokemonListStore((s) => s.markRestoreDone);

  /*
   * 1) Inicialización SSR:
   * - Si entramos a "/", guardamos initialCards en store (solo si store estaba vacío).
   * - Si volvemos desde detalle y el store ya tiene cache, NO lo pisamos.
   */
  useEffect(() => {
    setInitialSSR(props.initialCards);
  }, [props.initialCards, setInitialSSR]);

  /*
   * 2) Debounce real (200ms):
   * - el usuario escribe -> actualiza store.query
   * - esperamos 200ms sin cambios antes de convertirlo en "debounced"
   */
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const normalized = useMemo(() => normalizeQuery(debounced), [debounced]);

  /*
   * Determina si estamos en modo:
   * - "Home limpia" (sin filtros): mostramos SSR fallback, sin query al backend
   * - "Search mode" (con filtros o texto): activamos query server-side
   */
  const hasAnyFilter =
    normalized.length > 0 || selectedType !== "" || selectedGen !== "";

  /*
   * 3) Al cambiar filtros/búsqueda:
   * - volvemos al inicio (cursor 0)
   * - si NO hay filtros => recuperamos SSR (rápido y sin backend)
   * - si hay filtros => limpiamos items para mostrar "Loading…" en vez de SSR
   */
  useEffect(() => {
    // al cambiar filtros/búsqueda volvemos al inicio
    setCursor(0);

    // si NO hay filtros/búsqueda => SSR fallback inmediato
    if (!hasAnyFilter) {
      setInitialSSR(props.initialCards);
      return;
    }

    //Esto fuerza una 'pantalla limpia' para que no se mezclen resultados anteriores durante el fetch.
    setInitialSSR([]);
  }, [hasAnyFilter, props.initialCards, setCursor, setInitialSSR]);

  /*
   * Cargar opciones de filtros (solo UI):
   * - No dependen de query
   * - Son casi estáticas => staleTime largo (24h)
   */
  const typesQuery = api.pokemon.typesList.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
  });

  const generationsQuery = api.pokemon.generationsList.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
  });

  /*
   * Query server-side:
   * - delegamos al BFF la lógica de búsqueda + expansión de evoluciones + filtros
   * - cursor/limit implementan paginación
   *
   * enabled:
   * - evita hacer fetch al entrar a "/" sin filtros
   * - pero permite seguir paginando (cursor > 0) aunque normalized sea vacío
   */
  const searchQuery = api.pokemon.search.useQuery(
    {
      q: normalized,
      type: selectedType ? selectedType : null,
      generation: selectedGen ? selectedGen : null,
      cursor,
      limit: PAGE_SIZE,
    },
    {
      staleTime: 30_000,
      enabled: hasAnyFilter, // evita disparar query al entrar en "/" limpio
    },
  );

  /*
   * 4) Aplicar resultados al store:
   * - cursor=0 => replace (nueva búsqueda)
   * - cursor>0 => append (load more)
   */
  useEffect(() => {
    const data = searchQuery.data;
    if (!data) return;

    if (cursor === 0) setResults(data.items, data.nextCursor);
    else appendResults(data.items, data.nextCursor);
  }, [searchQuery.data, cursor, setResults, appendResults]);

  /*
   * 5) Restore scroll:
   * - al volver desde detail, el store marca shouldRestoreScroll=true
   * - hacemos scrollTo y desactivamos el flag para que no se repita
   */
  useEffect(() => {
    if (!shouldRestoreScroll) return;
    window.scrollTo(0, scrollY);
    markRestoreDone();
  }, [shouldRestoreScroll, scrollY, markRestoreDone]);

  const canLoadMore = nextCursor !== null;

  /*
   * Lista final a renderizar:
   * - De-duplicamos por id para evitar repeticiones, defensa por si el backend expande evoluciones y el mismo Pokémon entra por distintas ramas / merges
   *   (por ejemplo, expansión de evoluciones + paginación)
   * - Ordenamos por id para mantener estabilidad visual
   */
  const renderedItems = useMemo(() => {
    const map = new Map<number, PokemonCardItem>();

    for (const p of items) {
      map.set(p.id, p); // si se repite, se queda el último
    }

    return Array.from(map.values()).sort((a, b) => a.id - b.id);
  }, [items]);
  return (
    <div className="space-y-6">
      {/* Search + filters row */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="shadow-card-soft flex w-full max-w-xl items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 py-3">
          <span className="text-black/40">🔍</span>

          <div className="relative w-full">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or number"
              className="w-full bg-transparent pr-6 outline-none"
            />

            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-0 -translate-y-1/2 rounded-full p-1 text-black/40 hover:bg-black/5 hover:text-black"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Type */}
        <select
          value={selectedType ?? ""}
          onChange={(e) =>
            setType(e.target.value === "" ? null : e.target.value)
          }
          className="shadow-card-soft rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-semibold text-black/70 uppercase outline-none"
        >
          <option value="">All types</option>
          {(typesQuery.data ?? []).map((t) => (
            <option key={t} value={t} className="uppercase">
              {t}
            </option>
          ))}
        </select>

        {/* Generation */}
        <select
          value={selectedGen ?? ""}
          onChange={(e) =>
            setGeneration(e.target.value === "" ? null : e.target.value)
          }
          className="shadow-card-soft rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-semibold text-black/70 uppercase outline-none"
        >
          <option value="">All generations</option>
          {(generationsQuery.data ?? []).map((g) => (
            <option key={g.id} value={g.name}>
              {formatGenerationName(g.name)}
            </option>
          ))}
        </select>
      </div>

      {/* States */}

      {searchQuery.isLoading && renderedItems.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          Loading Pokémon…
        </div>
      ) : searchQuery.isError ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          Something went wrong loading Pokémon.
        </div>
      ) : renderedItems.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          No results.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {renderedItems.map((p) => (
              <PokemonCard key={p.id} p={p} />
            ))}
          </div>

          {/* Load more */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 px-4 py-2 text-sm font-medium text-black/70 uppercase hover:bg-[#3b9ccb]/10"
              disabled={!canLoadMore || searchQuery.isFetching}
              onClick={() => {
                if (nextCursor === null) return;
                setCursor(nextCursor);
              }}
            >
              {searchQuery.isFetching
                ? "Loading…"
                : canLoadMore
                  ? "Load more"
                  : "End of list"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
