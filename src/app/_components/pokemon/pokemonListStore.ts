/*
import { create } from "zustand";
import type { StoreApi } from "zustand";

export type PokemonListState = {
  query: string;
  type: string | null;
  generation: string | null;

  cursor: number;

  scrollY: number;
  shouldRestoreScroll: boolean;

  setQuery: (q: string) => void;
  setType: (t: string | null) => void;
  setGeneration: (g: string | null) => void;

  resetCursor: () => void;
  setCursor: (c: number) => void;

  saveScroll: (y: number) => void;
  markRestoreDone: () => void;

  resetAll: () => void;
};

// 👇 Este es el punto clave: `set` tipado con el `setState` real
type SetState<T> = StoreApi<T>["setState"];

export const usePokemonListStore = create<PokemonListState>((set: SetState<PokemonListState>) => ({
  query: "",
  type: null,
  generation: null,

  cursor: 0,

  scrollY: 0,
  shouldRestoreScroll: false,

  setQuery: (q) => set({ query: q, cursor: 0 }),
  setType: (t) => set({ type: t, cursor: 0 }),
  setGeneration: (g) => set({ generation: g, cursor: 0 }),

  resetCursor: () => set({ cursor: 0 }),
  setCursor: (c) => set({ cursor: c }),

  saveScroll: (y) => set({ scrollY: y, shouldRestoreScroll: true }),
  markRestoreDone: () => set({ shouldRestoreScroll: false }),

  resetAll: () =>
    set({
      query: "",
      type: null,
      generation: null,
      cursor: 0,
      scrollY: 0,
      shouldRestoreScroll: false,
    }),
}));
*/

/*
"use client";

import { create } from "zustand";

type PokemonListState = {
  // UI state
  query: string;
  type: string | null;
  generation: string | null;

  // pagination
  cursor: number;

  // scroll restore
  scrollY: number;
  shouldRestoreScroll: boolean;

  // actions
  setQuery: (q: string) => void;
  setType: (t: string | null) => void;
  setGeneration: (g: string | null) => void;
  resetCursor: () => void;
  setCursor: (c: number) => void;

  saveScroll: (y: number) => void;
  markRestoreDone: () => void;
};

export const usePokemonListStore = create<PokemonListState>((set) => ({
  query: "",
  type: null,
  generation: null,

  cursor: 0,

  scrollY: 0,
  shouldRestoreScroll: false,

  setQuery: (q) =>
    set(() => ({
      query: q,
      cursor: 0, // cuando cambia búsqueda, volvemos al inicio
    })),

  setType: (t) =>
    set(() => ({
      type: t,
      cursor: 0,
    })),

  setGeneration: (g) =>
    set(() => ({
      generation: g,
      cursor: 0,
    })),

  resetCursor: () => set(() => ({ cursor: 0 })),
  setCursor: (c) => set(() => ({ cursor: c })),

  saveScroll: (y) => set(() => ({ scrollY: y, shouldRestoreScroll: true })),
  markRestoreDone: () => set(() => ({ shouldRestoreScroll: false })),
}));
*/

"use client";

import { create } from "zustand";
import type { PokemonCardItem } from "~/app/_components/pokemon/types";

type PokemonListState = {
  // UI state
  query: string;
  type: string | null;
  generation: string | null;

  // pagination
  cursor: number;

  // cached list (para volver sin perder lo ya cargado)
  items: PokemonCardItem[];
  nextCursor: number | null;

  // scroll restore
  scrollY: number;
  shouldRestoreScroll: boolean;

  // actions
  setQuery: (q: string) => void;
  setType: (t: string | null) => void;
  setGeneration: (g: string | null) => void;

  setCursor: (c: number) => void;
  resetPaging: () => void;

  setResults: (items: PokemonCardItem[], nextCursor: number | null) => void;
  appendResults: (items: PokemonCardItem[], nextCursor: number | null) => void;
  setInitialSSR: (items: PokemonCardItem[]) => void;

  saveScroll: (y: number) => void;
  markRestoreDone: () => void;
};

export const usePokemonListStore = create<PokemonListState>((set) => ({
  query: "",
  type: null,
  generation: null,

  cursor: 0,

  items: [],
  nextCursor: null,

  scrollY: 0,
  shouldRestoreScroll: false,

  setQuery: (q) =>
    set(() => ({
      query: q,
      cursor: 0,
      items: [],
      nextCursor: null,
    })),

  setType: (t) =>
    set(() => ({
      type: t,
      cursor: 0,
      items: [],
      nextCursor: null,
    })),

  setGeneration: (g) =>
    set(() => ({
      generation: g,
      cursor: 0,
      items: [],
      nextCursor: null,
    })),

  setCursor: (c) => set(() => ({ cursor: c })),

  resetPaging: () =>
    set(() => ({
      cursor: 0,
      items: [],
      nextCursor: null,
    })),

  setResults: (items, nextCursor) =>
    set(() => ({
      items,
      nextCursor,
    })),

  appendResults: (items, nextCursor) =>
    set((s) => ({
      items: [...s.items, ...items],
      nextCursor,
    })),

  setInitialSSR: (items) =>
    set((s) => ({
      // solo si aún no tenemos nada cacheado en store
      items: s.items.length ? s.items : items,
    })),

  saveScroll: (y) => set(() => ({ scrollY: y, shouldRestoreScroll: true })),
  markRestoreDone: () => set(() => ({ shouldRestoreScroll: false })),
}));
