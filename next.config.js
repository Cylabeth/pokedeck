/**
 * Configuración de Next.js para permitir imágenes remotas:
 * - raw.githubusercontent.com → sprites oficiales usados en evolution artwork
 * - pokeapi.co → imágenes servidas directamente por PokeAPI
 *
 * Esto es necesario para que <Image /> funcione correctamente con dominios externos.
 */

import "./src/env.js";

/** @type {import("next").NextConfig} */
const config = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "raw.githubusercontent.com" },
      { protocol: "https", hostname: "pokeapi.co" },
    ],
  },
};

export default config;



