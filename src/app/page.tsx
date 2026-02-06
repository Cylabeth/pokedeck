import Link from "next/link";
import { HydrateClient } from "~/trpc/server";
import { api } from "~/trpc/server";
import { getTypeBadgeClass } from "~/app/_lib/pokemonTypeStyles";


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

export default async function Home() {
  const index = await api.pokemon.indexAll();
  const first = index.slice(0, 12).map((p) => p.name);

  const cards = await api.pokemon.hydrate({ names: first });

  return (
    <HydrateClient>
      <main className="bg-dots relative min-h-screen">
        <header>
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
            <div>
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/logo.svg"
                  alt="Pokédeck"
                  className="h-25 w-auto"
                />
                 <h1 className="pokemon-name text-7xl font-semibold">Pokédeck</h1>
              </div>
            </div>

            <div className="text-sm text-black/60">
              Sorted by <span className="font-medium text-black/80">id</span>
            </div>
          </div>
        </header>
        <div className="pointer-events-none absolute inset-0 z-0">
          <div className="bg-watermark" />
        </div>
        <section className="mx-auto max-w-6xl px-4 py-10">
          <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-panel-soft backdrop-blur">
            {/* contenido delante */}
            <div className="relative z-10 px-6 py-8">
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((p) => (
                  <Link
                    key={p.id}
                    href={`/pokemon/${p.name}`}
                    className="rounded-2xl border border-black/10 bg-white/80 p-4 shadow-card-soft transition-shadow"
                  >
                    {/* screen */}
                    <div className="relative rounded-2xl screen-dots p-4 ring-1 ring-black/5">
                      {/* id badge */}
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
                      <div className="mt-3 flex flex-wrap gap-2 justify-center">
                        {p.types.map((t) => (
                          <span
                            key={t}
                            className={`rounded-full px-3 py-1 text-sm uppercase font-semibold text-white tracking-wide ${getTypeBadgeClass(t)}`}
                          >
                            {cap(t)}
                          </span>
                        ))}
                      </div>
                    </div>    
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>

      </main>
    </HydrateClient>
  );
}
