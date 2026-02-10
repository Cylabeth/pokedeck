const GENERATION_STYLES: Record<string, string> = {
  "generation-i": "bg-[#C03028] text-white",
  "generation-ii": "bg-[#E0C068] text-white",
  "generation-iii": "bg-[#A8B820] text-white",
  "generation-iv": "bg-[#B8B8D0] text-white",
  "generation-v": "bg-[#705848] text-white",
  "generation-vi": "bg-[#EE99AC] text-white",
  "generation-vii": "bg-[#F8D030] text-white",
  "generation-viii": "bg-[#6890F0] text-white",
  "generation-ix": "bg-[#F08030] text-white",
};

export function getGenerationBadgeClass(genName: string): string {
  return GENERATION_STYLES[genName] ?? "bg-black/10 text-white";
}

export function formatGenerationName(genName?: string): string {
  if (!genName) return "UNKNOWN";
  // "generation-i" -> "GEN I"
  const roman = genName.replace("generation-", "").toUpperCase();
  return `GEN ${roman}`;
}


export function formatGenerationLabel(gen?: string | null) {
  if (!gen) return "UNKNOWN";

  const match = /^generation-([ivx]+)$/i.exec(gen);
  const roman = match?.[1];
  if (roman) return `GEN ${roman.toUpperCase()}`;

  return gen.replace(/^generation-/, "GEN ").replaceAll("-", " ");
}

