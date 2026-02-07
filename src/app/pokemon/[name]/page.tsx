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
