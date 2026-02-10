
"use client";

import { create } from "zustand";
import type { PokemonCardItem } from "~/app/_components/pokemon/types";

/*
 * Store global de la lista de pokemons (client-side):
 * - Centraliza filtros, paginación y cache local de resultados.
 * - Permite volver desde la página de detalle sin perder scroll ni resultados ya cargados.
 * - Evita refetch innecesario cuando el usuario navega atrás.
 */

type PokemonListState = {
  // -------------------------
  // UI state (filtros)
  // -------------------------
  query: string;
  type: string | null;
  generation: string | null;

  // -------------------------
  // paginación
  // -------------------------
  cursor: number;

  // -------------------------
  // cache local de resultados
  // -------------------------
  items: PokemonCardItem[];
  nextCursor: number | null;

  // -------------------------
  // scroll restore (UX)
  // -------------------------
  scrollY: number;
  shouldRestoreScroll: boolean;

  // -------------------------
  // actions
  // -------------------------
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

  /*
   * Cada cambio de filtro reinicia paginación y cache
   * para disparar una nueva búsqueda coherente.
   */
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

  /*
   * Reinicia completamente la paginación (ej: cambio de filtros)
   */
  resetPaging: () =>
    set(() => ({
      cursor: 0,
      items: [],
      nextCursor: null,
    })),

  /*
   * Reemplaza resultados (primer fetch)
   */
  setResults: (items, nextCursor) =>
    set(() => ({
      items,
      nextCursor,
    })),


  /*
   * Append incremental (infinite scroll)
   */
  appendResults: (items, nextCursor) =>
    set((s) => ({
      items: [...s.items, ...items],
      nextCursor,
    })),


  /*
   * Inicialización SSR:
   * - Si venimos directo a la lista desde SSR, cargamos resultados iniciales.
   * - Si volvemos desde detalle y ya hay cache, NO sobrescribimos.
   */
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


  /*
   * Scroll restoration:
   * - Antes de navegar al detalle guardamos posición.
   * - Al volver restauramos scroll sin perder contexto.
   */
  saveScroll: (y) => set(() => ({ scrollY: y, shouldRestoreScroll: true })),
  markRestoreDone: () => set(() => ({ shouldRestoreScroll: false })),
}));
