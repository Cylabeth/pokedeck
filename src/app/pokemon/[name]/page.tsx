import Link from "next/link";
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";
import { PokedexShell } from "~/app/_components/layout/PokedexShell";
import { getTypeBadgeClass, formatTypeLabel } from "~/app/_lib/pokemonTypeStyles";
import { formatGenerationLabel, getGenerationBadgeClass } from "~/app/_lib/pokemonGenerationStyles";
import EvolutionStepper from "~/app/_components/pokemon/EvolutionStepper";
/* <Link href="/" className="text-black/70 hover:text-black">
          ← Back to list
        </Link>*/

type PageProps = {
  params: Promise<{ name: string }>;
};

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function PokemonDetailPage({ params }: PageProps) {
  const { name } = await params;

  const pokemon = await api.pokemon.detail({ name });

  if (!pokemon) notFound();

  return (
    <PokedexShell
      titleRight={
       
        <Link
  href="/"
  className="mb-4 inline-flex items-center gap-2 rounded-full border border-black/10 px-3 py-1 text-sm font-medium text-black/70 hover:bg-[#3b9ccb]/10 uppercase"
>
  <b className="text-2xl">←</b> Back to list
</Link>

      }
    >
      <div className="grid gap-10 lg:grid-cols-[360px_1fr]">
        {/* LEFT COLUMN */}
        <div>
          {/* Image */}
          <div className="rounded-2xl bg-[#dff1f6] p-6 shadow-card-soft screen-dots">
            {pokemon.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pokemon.imageUrl}
                alt={pokemon.name}
                className="mx-auto h-64 w-64 object-contain"
              />
            ) : (
              <div className="h-64 w-64 rounded-xl bg-black/10" />
            )}
          </div>

          {/* Types */}
          <div className="mt-6">
            <h3 className="mb-2 text-sm font-semibold uppercase text-black/60">
              Types
            </h3>
            <div className="flex flex-wrap gap-2">
              {pokemon.types.map((t) => (
                <span
                  key={t}
                  className={`rounded-full px-3 py-1 text-sm font-semibold uppercase ${getTypeBadgeClass(
                    t,
                  )}`}
                >
                  {formatTypeLabel(t)}
                </span>
              ))}
            </div>
          </div>

          {/* Generation */}
          <div className="mt-4 text-sm text-black/60">
            <h3 className="mb-2 text-sm font-semibold uppercase text-black/60">
              Generation
            </h3>
            <span className={`rounded-full px-3 py-1 text-sm font-semibold uppercase ${getGenerationBadgeClass(
                    pokemon.generation?.name ?? "",
                  )}`}>
              {formatGenerationLabel(pokemon.generation?.name) ?? "UNKNOWN"}
            </span>
          </div>
        </div>

        {/* RIGHT COLUMN */}
        <div>
          {/* Header */}
          <div className="mb-4">
            <div className="text-sm text-black/50">
              #{String(pokemon.id).padStart(4, "0")}
            </div>
            <h2 className="pokemon-name text-5xl font-semibold">
              {cap(pokemon.name)}
            </h2>
            {pokemon.genus && (
              <div className="mt-1 text-black/60">{pokemon.genus}</div>
            )}
          </div>

          {/* Flavor text */}
          {pokemon.flavorText && (
            <p className="mb-6 max-w-2xl text-black/70">
              {pokemon.flavorText}
            </p>
          )}

          {/* Stats */}
          <div className="mb-8">
            <h3 className="mb-3 text-sm font-semibold uppercase text-black/60">
              Base stats
            </h3>
            <div className="space-y-2">
              {pokemon.stats.map((s) => (
                <div key={s.name} className="flex items-center gap-3">
                  <div className="w-24 text-xs uppercase text-black/50">
                    {s.name}
                  </div>
                  <div className="flex-1 rounded-full bg-black/10">
                    <div
                      className="h-2 rounded-full bg-[#3b9ccb]/60"
                      style={{ width: `${Math.min(s.value, 100)}%` }}
                    />
                  </div>
                  <div className="w-8 text-right text-xs text-black/70">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Evolutions */}
          {/*
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-black/60">
              Evolutions
            </h3>

            <div className="flex flex-wrap items-center gap-4">
              {pokemon.evolutions.map((evo) => {
                const isCurrent = evo.name === pokemon.speciesName;

                return (
                  <Link
                    key={evo.name}
                    href={`/pokemon/${evo.name}`}
                    className={`flex flex-col items-center gap-2 rounded-xl p-3 transition ${
                      isCurrent
                        ? "bg-[#dff1f6] ring-2 screen-dots ring-[#3b9ccb]/30"
                        : "bg-white/80 hover:shadow-card-soft"
                    }`}
                  > 
                    {evo.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={evo.imageUrl}
                        alt={evo.name}
                        className="h-20 w-20 object-contain"
                      />
                    ) : (
                      <div className="h-20 w-20 rounded-lg bg-[#dff1f6] screen-dots " />
                    )}
                    <div className="text-xs font-semibold">
                      {cap(evo.name)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
          */}
          <EvolutionStepper
  evolutions={pokemon.evolutions}
  currentName={pokemon.speciesName}
  cap={cap}
/>

        </div>
      </div>
    </PokedexShell>
  );
}
