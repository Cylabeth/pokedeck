import { HydrateClient, api } from "~/trpc/server";
import { PokemonListClient } from "~/app/_components/pokemon/PokemonListClient";
import { PokedexShell } from "~/app/_components/layout/PokedexShell";

export default async function Home() {
  /*
   * SSR fallback:
   * - Renderizamos una primera “página” de Pokémon en el servidor para:
   *   1) tener contenido inmediato (mejor UX)
   *   2) evitar un flash de loading al entrar a "/"
   *   3) reducir llamadas client-side cuando no hay filtros
   *
   * Importante:
   * - indexAll() devuelve el índice global (name + id), barato de pedir y cacheable.
   * - hydrate() trae los datos presentables (imagen, tipos, generación) SOLO para esa primera página.
   */
  const index = await api.pokemon.indexAll();
  const first = index.slice(0, 24).map((p) => p.name);
  const cards = await api.pokemon.hydrate({ names: first });

  return (
    /*
     * HydrateClient:
     * - “Hidrata” el estado de tRPC/React Query para que el cliente reutilice
     *   lo que ya se calculó en server y no refetchee innecesariamente.
     *
     * PokedexShell:
     * - layout/estilos compartidos (marco del “dispositivo” / UI general)
     *
     * PokemonListClient:
     * - componente client que maneja búsqueda, filtros, scroll restore y paginación
     * - recibe initialCards para poder pintar la home limpia sin pedir al backend
     */
    <HydrateClient>
      <PokedexShell>
        <PokemonListClient initialCards={cards} />
      </PokedexShell>
    </HydrateClient>
  );
}
