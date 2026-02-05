import Link from "next/link";
import { HydrateClient } from "~/trpc/server";
import { api } from "~/trpc/server";

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default async function Home() {
  const index = await api.pokemon.indexAll();
  const first = index.slice(0, 12).map((p) => p.name);

  const cards = await api.pokemon.hydrate({ names: first });

  return (
    <HydrateClient>
      <main className="min-h-screen bg-white">
        <header className="border-b">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
            <div>
              <h1 className="text-2xl font-semibold">Pokédeck</h1>
              <p className="text-sm text-black/60">
                Smoke UI: indexAll + hydrate via BFF (tRPC)
              </p>
            </div>

            <div className="text-sm text-black/60">
              Sorted by <span className="font-medium text-black/80">id</span>
            </div>
          </div>
        </header>

        <section className="mx-auto max-w-6xl px-4 py-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {cards.map((p) => (
              <Link
                key={p.id}
                href={`/pokemon/${p.name}`}
                className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="rounded-xl bg-black/3 p-4">
                  {p.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="mx-auto h-28 w-28 object-contain"
                      loading="lazy"
                    />
                  ) : (
                    <div className="mx-auto h-28 w-28 rounded-xl bg-black/10" />
                  )}
                </div>

                <div className="mt-3 text-xs text-black/60">
                  #{String(p.id).padStart(4, "0")}
                </div>

                <div className="mt-1 text-lg font-semibold">{cap(p.name)}</div>

                <div className="mt-1 text-xs text-black/60">
                  {p.generation?.name ?? "unknown generation"}
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {p.types.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-black/5 px-3 py-1 text-xs font-medium text-black/80"
                    >
                      {cap(t)}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
    </HydrateClient>
  );
}
