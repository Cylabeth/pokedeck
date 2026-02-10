import Link from "next/link";
import Image from "next/image";

/*
 * Tipo mínimo que necesitamos para renderizar la cadena evolutiva:
 * - name: se usa para texto y para la URL del detalle
 * - imageUrl: puede ser null/undefined si la API no trae sprite usable
 */

type Evolution = {
  name: string;
  imageUrl?: string | null;
};

type Props = {
  evolutions: Evolution[];
  currentName: string;

  // Pasamos cap desde el padre para reutilizar el mismo helper de formato
  // (y evitar duplicar lógica de UI).
  cap: (s: string) => string;
};

export default function EvolutionStepper({
  evolutions,
  currentName,
  cap,
}: Props) {
  return (
    /*
     * Layout en "stepper":
     * - flex-wrap para que se adapte en móvil sin romper el layout
     * - gap para separar ítems y flechas
     */
    <div className="flex flex-wrap items-center gap-4">
      {evolutions.map((evo, index) => {
        /*
         * Estado visual:
         * - isCurrent: highlight del Pokémon que estamos viendo
         * - isLast: para no dibujar flecha al final
         */
        const isCurrent = evo.name === currentName;
        const isLast = index === evolutions.length - 1;

        return (
          <div key={evo.name} className="flex items-center gap-4">
            {/*
             * Cada nodo es navegable:
             * - Link a /pokemon/[name] para saltar al detalle de esa evo
             * - Estilos cambian si es el actual (resalta)
             */}
            <Link
              href={`/pokemon/${evo.name}`}
              className={`flex flex-col items-center gap-2 rounded-xl p-3 transition ${
                isCurrent
                  ? "screen-dots bg-[#dff1f6] ring-2 ring-[#3b9ccb]/30"
                  : "hover:shadow-card-soft bg-white/80"
              }`}
            >
              {/*
               * Imagen:
               * - Usamos next/image para optimización (lazy, responsive internamente)
               * - IMPORTANTE: next/image exige width/height (o fill) => evita el runtime error que vimos.
               * - Si no hay imageUrl, mostramos placeholder para no romper el layout.
               */}
              {evo.imageUrl ? (
                <Image
                  src={evo.imageUrl}
                  alt={evo.name}
                  width={80}
                  height={80}
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="screen-dots h-20 w-20 rounded-lg bg-[#dff1f6]" />
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
