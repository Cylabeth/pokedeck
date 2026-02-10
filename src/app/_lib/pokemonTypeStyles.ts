const TYPE_STYLES: Record<string, string> = {
  bug: "bg-[#A8B820] ",
  dragon: "bg-[#7038F8] text-white",
  fairy: "bg-[#EE99AC] text-white",
  fire: "bg-[#F08030] text-white",
  ghost: "bg-[#705898] text-white",
  ground: "bg-[#E0C068] text-white",
  normal: "bg-[#A8A878] text-white",
  psychic: "bg-[#F85888] text-white",
  steel: "bg-[#B8B8D0] text-white",
  dark: "bg-[#705848] text-white",
  electric: "bg-[#F8D030] text-white",
  fighting: "bg-[#C03028] text-white",
  flying: "bg-[#A890F0] text-white",
  grass: "bg-[#78C850] text-white",
  ice: "bg-[#98D8D8] text-white",
  poison: "bg-[#A040A0] text-white",
  rock: "bg-[#B8A038] text-white",
  water: "bg-[#6890F0] text-white",
};

export function getTypeBadgeClass(type: string): string {
  return TYPE_STYLES[type] ?? "bg-black/10 text-white";
}

export function formatTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
