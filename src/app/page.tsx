import { HydrateClient, api } from "~/trpc/server";
import { PokemonListClient } from "~/app/_components/pokemon/PokemonListClient";
import { PokedexShell } from "~/app/_components/layout/PokedexShell";

export default async function Home() {
  const index = await api.pokemon.indexAll();
  const first = index.slice(0, 24).map((p) => p.name);
  const cards = await api.pokemon.hydrate({ names: first });

  return (
    <HydrateClient>
      <PokedexShell>
        <PokemonListClient initialCards={cards} />
      </PokedexShell>
    </HydrateClient>
  );
}
