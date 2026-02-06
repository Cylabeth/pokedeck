const TYPE_STYLES: Record<string, string> = {
  bug: "bg-[#A8B820] text-black",
  dragon: "bg-[#7038F8] text-white",
  fairy: "bg-[#EE99AC] text-black",
  fire: "bg-[#F08030] text-black",
  ghost: "bg-[#705898] text-white",
  ground: "bg-[#E0C068] text-black",
  normal: "bg-[#A8A878] text-black",
  psychic: "bg-[#F85888] text-black",
  steel: "bg-[#B8B8D0] text-black",
  dark: "bg-[#705848] text-white",
  electric: "bg-[#F8D030] text-black",
  fighting: "bg-[#C03028] text-white",
  flying: "bg-[#A890F0] text-black",
  grass: "bg-[#78C850] text-black",
  ice: "bg-[#98D8D8] text-black",
  poison: "bg-[#A040A0] text-white",
  rock: "bg-[#B8A038] text-black",
  water: "bg-[#6890F0] text-black",
};

export function getTypeBadgeClass(type: string): string {
  return TYPE_STYLES[type] ?? "bg-black/10 text-black";
}

export function formatTypeLabel(type: string): string {
  return type.charAt(0).toUpperCase() + type.slice(1);
}
