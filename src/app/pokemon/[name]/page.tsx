{/*
import { notFound } from "next/navigation";
import { api } from "~/trpc/server";

type PageProps = {
  params: Promise<{
    name: string;
  }>;
};

export default async function PokemonDetailPage({ params }: PageProps) {
  const { name } = await params;

  const data = await api.pokemon.hydrate({ names: [name] });

  if (!data || data.length === 0) {
    notFound();
  }

  const pokemon = data[0]!;

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="pokemon-name mb-6 text-5xl font-semibold">
        {pokemon.name}
      </h1>

      {pokemon.imageUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pokemon.imageUrl}
          alt={pokemon.name}
          className="h-64 w-64 object-contain"
        />
      )}

      <div className="mt-6">
        <h2 className="text-xl font-semibold">Types</h2>
        <ul className="mt-2 flex gap-2">
          {pokemon.types.map((t) => (
            <li
              key={t}
              className="rounded-full bg-black/10 px-3 py-1 text-sm"
            >
              {t}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-6 text-black/60">
        Generation: {pokemon.generation?.name ?? "Unknown"}
      </div>
    </main>
  );
}
*/}

import Link from "next/link";
import { notFound } from "next/navigation";

import { api } from "~/trpc/server";
import { PokedexShell } from "~/app/_components/layout/PokedexShell";
import { getTypeBadgeClass } from "~/app/_lib/pokemonTypeStyles";

type PageProps = {
  params: Promise<{
    name: string;
  }>;
};

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

export default async function PokemonDetailPage({ params }: PageProps) {
  const { name } = await params;

  const data = await api.pokemon.hydrate({ names: [name] });
  if (!data || data.length === 0) notFound();

  const pokemon = data[0]!;

  return (
    <PokedexShell
      titleRight={
        <Link href="/" className="text-black/70 hover:text-black">
          ← Back to list
        </Link>
      }
    >
      {/* Placeholder layout interno (luego lo ampliamos con species/stats/evolutions) */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left: image + quick meta */}
        <div className="space-y-6">
          <div className="relative rounded-3xl screen-dots p-6 ring-1 ring-black/5">
            <div className="absolute left-4 top-4 text-sm font-semibold text-black/70">
              #{String(pokemon.id).padStart(4, "0")}
            </div>

            {pokemon.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pokemon.imageUrl}
                alt={pokemon.name}
                className="mx-auto h-72 w-72 object-contain"
                loading="lazy"
              />
            ) : (
              <div className="mx-auto h-72 w-72 rounded-2xl bg-black/10" />
            )}
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/70 p-6">
            <div className="text-sm text-black/50 uppercase tracking-wide">
              {formatGenerationName(pokemon.generation?.name)}
            </div>

            <div className="mt-4">
              <div className="text-sm font-semibold text-black/70">Types</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {pokemon.types.map((t) => (
                  <span
                    key={t}
                    className={`rounded-full px-3 py-1 text-sm uppercase font-semibold tracking-wide ${getTypeBadgeClass(
                      t,
                    )}`}
                  >
                    {cap(t)}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Right: title + placeholder for description/stats/evolutions */}
        <div className="space-y-6">
          <div>
            <h1 className="pokemon-name text-6xl font-semibold">
              {cap(pokemon.name)}
            </h1>
            <div className="mt-2 text-black/50">
              Pokédex #{String(pokemon.id).padStart(4, "0")}
            </div>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 text-black/70">
            <div className="text-sm font-semibold text-black/70">
              Description
            </div>
            <p className="mt-2 text-sm leading-relaxed text-black/60">
              (Next step) We’ll pull the Pokédex flavor text from{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">
                /pokemon-species
              </code>{" "}
              and render it here.
            </p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 text-black/70">
            <div className="text-sm font-semibold text-black/70">Stats</div>
            <p className="mt-2 text-sm text-black/60">
              (Next step) We’ll render stats as dots/bars using the existing
              stats from <code className="rounded bg-black/5 px-1 py-0.5">
                /pokemon
              </code>.
            </p>
          </div>

          <div className="rounded-3xl border border-black/10 bg-white/70 p-6 text-black/70">
            <div className="text-sm font-semibold text-black/70">
              Evolution line
            </div>
            <p className="mt-2 text-sm text-black/60">
              (Next step) We’ll fetch the evolution chain via{" "}
              <code className="rounded bg-black/5 px-1 py-0.5">
                /pokemon-species → evolution-chain
              </code>{" "}
              and render a clickable chain with the current Pokémon highlighted.
            </p>
          </div>
        </div>
      </div>
    </PokedexShell>
  );
}
