
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
    set((s) => {
      // Si ya hay cache (ej: volvemos desde detalle), NO lo pisamos
      if (s.items.length) return s;

      const PAGE_SIZE = 24;
      const next =
        items.length >= PAGE_SIZE ? PAGE_SIZE : null;

      return {
        items,
        cursor: 0,
        nextCursor: next,
      };
    }),

  saveScroll: (y) => set(() => ({ scrollY: y, shouldRestoreScroll: true })),
  markRestoreDone: () => set(() => ({ shouldRestoreScroll: false })),
}));
