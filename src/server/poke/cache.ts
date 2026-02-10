/*
 * CacheEntry:
 * - value: dato cacheado
 * - expiresAt: timestamp absoluto en el que el valor deja de ser válido
 */
export type CacheEntry<T> = { value: T; expiresAt: number };


/*
 * MemoryCache:
 * Implementación simple de cache en memoria usando Map.
 *
 * Objetivo en el challenge:
 * - Reducir llamadas repetidas a PokeAPI
 * - Evitar rate limits
 * - Mantener la implementación simple (sin Redis / external cache)
 *
 * En producción:
 * - Este patrón normalmente se reemplaza por Redis / CDN cache,
 *   pero la interfaz (get/set con TTL) sería equivalente.
 */
export class MemoryCache {
  private store = new Map<string, CacheEntry<unknown>>();

  /*
   * get:
   * - Devuelve null si no existe
   * - Devuelve null si expiró (y limpia la entrada)
   * - Caso contrario devuelve el valor tipado
   */
  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;

    // Si expiró, eliminamos para mantener el store limpio
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  /*
   * set:
   * - Guarda el valor junto con su timestamp de expiración (TTL absoluto)
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
  }
}

/*
 * Instancia singleton:
 * - Se reutiliza en todo el BFF
 * - Evita múltiples caches independientes
 */
export const cache = new MemoryCache();
