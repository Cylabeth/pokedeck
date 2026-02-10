import { cache } from "./cache";

/*
 * BASE_URL:
 * Centralizamos el dominio de PokeAPI para poder aceptar:
 * - paths relativos ("/pokemon/1")
 * - urls completas (cuando PokeAPI nos devuelve evolution_chain.url, etc.)
 */
const BASE_URL = "https://pokeapi.co/api/v2";

export type FetchJsonOptions = {
  ttlMs?: number; // tiempo de vida del cache (en ms). 0 => no cachear
  timeoutMs?: number; // timeout por request para evitar cuelgues
  retryOnce?: boolean; // reintenta 1 vez ante error temporal (red / 5xx / rate limits intermitentes)
};


/*
 * fetchWithTimeout:
 * - fetch nativo no siempre “corta” requests lentas; con AbortController forzamos un timeout.
 * - Así evitamos que una request colgada bloquee el render/hidratación del server.
 */
async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}


/*
 * fetchJson:
 * Wrapper único para hablar con PokeAPI.
 *
 * Objetivos:
 * 1) Cache in-memory por TTL para evitar repetir llamadas y minimizar rate limit.
 * 2) Timeout para mantener el sistema responsivo (no “colgar” el SSR/handlers).
 * 3) Retry 1 vez, porque PokeAPI a veces falla de forma intermitente (red/429/5xx).
 *
 * Nota:
 * - pathOrUrl puede ser "/pokemon/ditto" o una URL completa (ej evolution_chain.url).
 * - cacheKey incluye la URL final: "poke:https://pokeapi.co/api/v2/pokemon/25"
 */
export async function fetchJson<T>(pathOrUrl: string, opts: FetchJsonOptions = {}): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  const ttlMs = opts.ttlMs ?? 0;
  const cacheKey = `poke:${url}`;

  // 1) Cache:
  // Si ttlMs > 0, intentamos servir desde memoria para ahorrar latencia y evitar rate limits.
  if (ttlMs > 0) {
    const cached = cache.get<T>(cacheKey);
    if (cached) return cached;
  }

  // 2) Defaults “seguros”:
  // - timeout 8s: suficiente para PokeAPI, pero evita colgar.
  // - retryOnce default true: reduce errores por fallos temporales sin complicar la lógica.
  const timeoutMs = opts.timeoutMs ?? 8000;
  const retryOnce = opts.retryOnce ?? true;

  // doFetch:
  // Encapsulamos la request real para poder:
  // - reintentar exactamente la misma llamada
  // - centralizar el manejo de errores (res.ok)
  const doFetch = async () => {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res.ok) {
      // Incluimos el body si existe (útil para debugging: 404, 429, etc.)
      const text = await res.text().catch(() => "");
      throw new Error(`PokeAPI ${res.status} ${url}${text ? ` - ${text}` : ""}`);
    }
    return (await res.json()) as T;
  };

  try {
    // 3) Camino feliz: fetch -> cache -> return
    const data = await doFetch();
    if (ttlMs > 0) cache.set(cacheKey, data, ttlMs);
    return data;
  } catch (err) {
    // 4) Retry simple:
    // Si hubo fallo y retryOnce está activo, reintentamos una vez.
    // Esto evita que un fallo puntual tire abajo el search/detail.
    if (!retryOnce) throw err;
    const data = await doFetch();
    if (ttlMs > 0) cache.set(cacheKey, data, ttlMs);
    return data;
  }
}
