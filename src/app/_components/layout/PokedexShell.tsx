// src/app/_components/layout/PokedexShell.tsx
import Link from "next/link";

export function PokedexShell(props: {
  titleRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <main className="bg-dots relative min-h-screen">
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6">
          <Link href="/" className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo.svg" alt="Pokédex" className="h-25 w-auto" />
            <h1 className="pokemon-name text-7xl font-semibold">Pokédex</h1>
          </Link>

          <div className="text-sm text-black/60">
            {props.titleRight ?? (
              <>
                Sorted by <span className="font-medium text-black/80">id</span>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="bg-watermark" />
      </div>

      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 shadow-panel-soft backdrop-blur">
          <div className="relative z-10 px-6 py-8">{props.children}</div>
        </div>
      </section>
    </main>
  );
}
