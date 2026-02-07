import Link from "next/link";
import { getTypeBadgeClass } from "~/app/_lib/pokemonTypeStyles";
import type { PokemonCardItem } from "./types";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatGenerationName(gen?: string | null) {
  if (!gen) return "Unknown generation";

  const match = /^generation-([ivx]+)$/i.exec(gen);
  const roman = match?.[1];
  if (roman) return `Gen ${roman.toUpperCase()}`;

  return gen.replace(/^generation-/, "Generation ").replaceAll("-", " ");
}

export function PokemonCard({ p }: { p: PokemonCardItem }) {
  return (
    <Link
      href={`/pokemon/${p.name}`}
      prefetch
      className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-card-soft transition-shadow"
    >
      <div className="relative rounded-2xl screen-dots p-4 ring-1 ring-black/5">
        <div className="absolute left-1 top-1 px-3 py-1 text-sm font-semibold text-black/70">
          #{String(p.id).padStart(4, "0")}
        </div>

        {p.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={p.imageUrl}
            alt={p.name}
            className="mx-auto h-37 w-37 object-contain"
            loading="lazy"
          />
        ) : (
          <div className="mx-auto h-37 w-37 rounded-xl bg-black/10" />
        )}
      </div>

      <div className="mt-3 text-center">
        <div className="pokemon-name mt-3 text-2xl font-semibold">
          {cap(p.name)}
        </div>

        <div className="mt-1 text-sm text-black/50 uppercase tracking-wide">
          {formatGenerationName(p.generation?.name)}
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {p.types.map((t) => (
            <span
              key={t}
              className={`rounded-full px-3 py-1 text-sm font-semibold uppercase tracking-wide text-white ${getTypeBadgeClass(
                t,
              )}`}
            >
              {cap(t)}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
