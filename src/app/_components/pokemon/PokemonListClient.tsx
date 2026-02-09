
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { PokemonCard } from "./PokemonCard";
import type { PokemonCardItem } from "./types";
import { usePokemonListStore } from "~/app/_components/pokemon/pokemonListStore";



const PAGE_SIZE = 24;



function normalizeQuery(raw: string) {
  return raw.trim().toLowerCase();
}


export function PokemonListClient(props: {
  // los dejamos por SSR fallback
  initialCards: PokemonCardItem[];
}) {
  
 // const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

//  const [selectedType, setSelectedType] = useState<string>("");
//  const [selectedGen, setSelectedGen] = useState<string>("");

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

useEffect(() => {
  setInitialSSR(props.initialCards);
}, [props.initialCards, setInitialSSR]);

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const normalized = useMemo(() => normalizeQuery(debounced), [debounced]);
  const hasAnyFilter =
  normalized.length > 0 || selectedType !== "" || selectedGen !== "";

useEffect(() => {
  // al cambiar filtros/búsqueda volvemos al inicio
  setCursor(0);

  // si NO hay filtros/búsqueda => SSR fallback inmediato
  if (!hasAnyFilter) {
    setInitialSSR(props.initialCards);
    return;
  }

  // si hay filtros/búsqueda => limpiamos para mostrar loading/resultado nuevo
  setInitialSSR([]);
}, [hasAnyFilter, props.initialCards, setCursor, setInitialSSR]);


  // Cargar opciones de filtros (solo UI)
  const typesQuery = api.pokemon.typesList.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
  });

  const generationsQuery = api.pokemon.generationsList.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
  });



  // Query server-side
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
      enabled: hasAnyFilter || cursor > 0, // evita disparar query al entrar en "/" limpio
    },
  );

  // cuando llega data, la aplicamos:
  // - cursor 0 => replace
  // - cursor >0 => append
useEffect(() => {
  const data = searchQuery.data;
  if (!data) return;

  if (cursor === 0) setResults(data.items, data.nextCursor);
  else appendResults(data.items, data.nextCursor);
}, [searchQuery.data, cursor, setResults, appendResults]);

useEffect(() => {
  if (!shouldRestoreScroll) return;
  window.scrollTo(0, scrollY);
  markRestoreDone();
}, [shouldRestoreScroll, scrollY, markRestoreDone]);

const canLoadMore = nextCursor !== null;
//const renderedItems =
//  items.length > 0 ? items : props.initialCards;

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
        <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-card-soft">
          <span className="text-black/40">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number"
            className="w-full bg-transparent outline-none"
          />
        </div>

        {/* Type */}
        <select
          value={selectedType ?? ""}
          onChange={(e) => setType(e.target.value === "" ? null : e.target.value)} 
          className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-semibold text-black/70 shadow-card-soft outline-none"
        >
          <option value="">All types</option>
          {(typesQuery.data ?? []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Generation */}
        <select
          value={selectedGen ?? ""}
          onChange={(e) => setGeneration(e.target.value === "" ? null : e.target.value)}
          className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-semibold text-black/70 shadow-card-soft outline-none"
        >
          <option value="">All generations</option>
          {(generationsQuery.data ?? []).map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm text-black/60">
          Sorted by <span className="font-medium text-black/80">id</span>
        </div>
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
              className="rounded-2xl border border-black/10 bg-white/80 px-6 py-3 text-sm font-semibold text-black/70 shadow-card-soft disabled:opacity-50"
              disabled={!canLoadMore || searchQuery.isFetching}
              onClick={() => {
              if (nextCursor === null) return;
                setCursor(nextCursor);
              }}
              
            >
              {searchQuery.isFetching ? "Loading…" : canLoadMore ? "Load more" : "End of list"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}






/*
"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "~/trpc/react";
import { PokemonCard } from "./PokemonCard";
import type { PokemonCardItem } from "./types";


const PAGE_SIZE = 24;

function normalizeQuery(raw: string) {
  return raw.trim();
}

export function PokemonListClient(props: {
  // los dejamos por SSR fallback
  initialCards: PokemonCardItem[];
}) {
  
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");

  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedGen, setSelectedGen] = useState<string>("");

  // debounce
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query), 200);
    return () => clearTimeout(t);
  }, [query]);

  const normalized = useMemo(() => normalizeQuery(debounced), [debounced]);

  // Cargar opciones de filtros (solo UI)
  const typesQuery = api.pokemon.typesList.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
  });

  const generationsQuery = api.pokemon.generationsList.useQuery(undefined, {
    staleTime: 24 * 60 * 60 * 1000,
  });

  // cursor para "load more"
  const [cursor, setCursor] = useState(0);
  const [items, setItems] = useState<PokemonCardItem[]>(props.initialCards);

  // cada vez que cambian filtros o búsqueda, reseteamos paging + items
  useEffect(() => {
    setCursor(0);
    // dejamos SSR mientras carga, pero limpiamos si hay filtros/búsqueda
    if (normalized.length > 0 || selectedType || selectedGen) {
      setItems([]);
    } else {
      setItems(props.initialCards);
    }
  }, [normalized, selectedType, selectedGen, props.initialCards]);

  // Query server-side
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
    },
  );

  // cuando llega data, la aplicamos:
  // - cursor 0 => replace
  // - cursor >0 => append
  useEffect(() => {
    const data = searchQuery.data;
    if (!data) return;

    if (cursor === 0) setItems(data.items);
    else setItems((prev) => [...prev, ...data.items]);
  }, [searchQuery.data, cursor]);

  const canLoadMore = searchQuery.data?.nextCursor !== null;

  return (
    <div className="space-y-6">
    */
      {/* Search + filters row */}
 /*     <div className="flex flex-wrap items-center gap-3">
        {/* Search */
 /*       <div className="flex w-full max-w-xl items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 py-3 shadow-card-soft">
          <span className="text-black/40">🔍</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or number"
            className="w-full bg-transparent outline-none"
          />
        </div>

        {/* Type */
   /*     <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-semibold text-black/70 shadow-card-soft outline-none"
        >
          <option value="">All types</option>
          {(typesQuery.data ?? []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        {/* Generation */
     /*   <select
          value={selectedGen}
          onChange={(e) => setSelectedGen(e.target.value)}
          className="rounded-2xl border border-black/10 bg-white/80 px-4 py-3 text-sm font-semibold text-black/70 shadow-card-soft outline-none"
        >
          <option value="">All generations</option>
          {(generationsQuery.data ?? []).map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>

        <div className="ml-auto text-sm text-black/60">
          Sorted by <span className="font-medium text-black/80">id</span>
        </div>
      </div>

      {/* States */
   /*   {searchQuery.isLoading && items.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          Loading Pokémon…
        </div>
      ) : searchQuery.isError ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          Something went wrong loading Pokémon.
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-black/10 bg-white/70 p-6 text-black/60">
          No results.
        </div>
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((p) => (
              <PokemonCard key={p.id} p={p} />
            ))}
          </div>

          {/* Load more */
     /*     <div className="flex justify-center pt-4">
            <button
              type="button"
              className="rounded-2xl border border-black/10 bg-white/80 px-6 py-3 text-sm font-semibold text-black/70 shadow-card-soft disabled:opacity-50"
              disabled={!canLoadMore || searchQuery.isFetching}
              onClick={() => {
                const next = searchQuery.data?.nextCursor;
                if (next === null || next === undefined) return;
                setCursor(next);
              }}
            >
              {searchQuery.isFetching ? "Loading…" : canLoadMore ? "Load more" : "End of list"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
*/


