import Link from "next/link";

type Evolution = {
  name: string;
  imageUrl?: string | null;
};

type Props = {
  evolutions: Evolution[];
  currentName: string;
  cap: (s: string) => string;
};

export default function EvolutionStepper({
  evolutions,
  currentName,
  cap,
}: Props) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      {evolutions.map((evo, index) => {
        const isCurrent = evo.name === currentName;
        const isLast = index === evolutions.length - 1;

        return (
          <div key={evo.name} className="flex items-center gap-4">
            <Link
              href={`/pokemon/${evo.name}`}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition ${
                isCurrent
                  ? "bg-[#dff1f6] ring-2 screen-dots ring-[#3b9ccb]/30"
                  : "bg-white/80 hover:shadow-card-soft"
              }`}
            >
              {evo.imageUrl ? (
                <img
                  src={evo.imageUrl}
                  alt={evo.name}
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg bg-[#dff1f6] screen-dots" />
              )}

              <div className="text-xs font-semibold">{cap(evo.name)}</div>
            </Link>

            {!isLast && (
              <span className="text-4xl text-[#eda364] select-none">➜</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
