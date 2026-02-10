import Link from "next/link";
import { getTypeBadgeClass } from "~/app/_lib/pokemonTypeStyles";
import type { PokemonCardItem } from "./types";
import { usePokemonListStore } from "~/app/_components/pokemon/pokemonListStore";
import { formatGenerationLabel } from "~/app/_lib/pokemonGenerationStyles";

/*
 * Helper visual:
 * - Capitaliza nombre/tipos para presentación consistente.
 * - La API devuelve todo en lowercase.
 */
function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function PokemonCard({ p }: { p: PokemonCardItem }) {
  /*
   * Guardamos posición de scroll antes de navegar:
   * - Permite volver desde el detail sin perder posición en la lista.
   * - El restore real se realiza en PokemonListClient.
   */
  const saveScroll = usePokemonListStore((s) => s.saveScroll);

  return (
    /*
     * Link directo al detail:
     * - Usamos navegación nativa de Next.js (prefetch activado).
     * - El click también guarda scrollY en el store global.
     */
    <Link
      href={`/pokemon/${p.name}`}
      onClick={() => saveScroll(window.scrollY)}
      prefetch
      className="shadow-card-soft rounded-2xl border border-black/10 bg-white/80 p-4 transition-shadow"
    >
      <div className="screen-dots relative rounded-2xl p-4 ring-1 ring-black/5">
        <div className="absolute top-1 left-1 px-3 py-1 text-sm font-semibold text-black/70">
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

        <div className="mt-1 text-sm tracking-wide text-black/50 uppercase">
          {formatGenerationLabel(p.generation?.name)}
        </div>

        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {p.types.map((t) => (
            <span
              key={t}
              className={`rounded-full px-3 py-1 text-sm font-semibold tracking-wide text-white uppercase ${getTypeBadgeClass(
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
