"use client";

import type { PokemonCardItem } from "./types";
import { PokemonCard } from "./PokemonCard";

export function PokemonListClient(props: {
  initialCards: PokemonCardItem[];
}) {
  // Por ahora solo render. Luego agregamos estado, search, filtros, scroll.
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
      {props.initialCards.map((p) => (
        <PokemonCard key={p.id} p={p} />
      ))}
    </div>
  );
}
