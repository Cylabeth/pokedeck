// src/app/_components/layout/PokedexShell.tsx
import Link from "next/link";

/*
 * Layout visual principal de la aplicación:
 * - Define el “shell” común de todas las páginas (header + panel central)
 * - Permite reutilizar estilos globales sin repetir markup en cada página
 *
 * titleRight:
 * - Permite que cada página inserte contenido en la esquina superior derecha
 *   (ej: botón "Back to list" en el detalle)
 * - Si no se pasa, mostramos la firma por defecto
 */

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
                Made by{" "}
                <Link
                  href="https://www.linkedin.com/in/elizabeth-gorosito/"
                  target="_blank"
                >
                  <span className="font-medium text-black/80">
                    Cynthia Elizabeth Gorosito
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Background global */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="bg-watermark" />
      </div>

      {/* Panel principal donde se renderizan las páginas */}
      <section className="mx-auto max-w-6xl px-4 py-10">
        <div className="shadow-panel-soft relative overflow-hidden rounded-3xl border border-black/10 bg-white/70 backdrop-blur">
          <div className="relative z-10 px-6 py-8">{props.children}</div>
        </div>
      </section>
    </main>
  );
}
