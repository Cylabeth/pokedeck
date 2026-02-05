import { cache } from "./cache";

const BASE_URL = "https://pokeapi.co/api/v2";

export type FetchJsonOptions = {
  ttlMs?: number;
  timeoutMs?: number;
  retryOnce?: boolean;
};

async function fetchWithTimeout(url: string, timeoutMs: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

export async function fetchJson<T>(pathOrUrl: string, opts: FetchJsonOptions = {}): Promise<T> {
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${BASE_URL}${pathOrUrl}`;
  const ttlMs = opts.ttlMs ?? 0;
  const cacheKey = `poke:${url}`;

  if (ttlMs > 0) {
    const cached = cache.get<T>(cacheKey);
    if (cached) return cached;
  }

  const timeoutMs = opts.timeoutMs ?? 8000;
  const retryOnce = opts.retryOnce ?? true;

  const doFetch = async () => {
    const res = await fetchWithTimeout(url, timeoutMs);
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`PokeAPI ${res.status} ${url}${text ? ` - ${text}` : ""}`);
    }
    return (await res.json()) as T;
  };

  try {
    const data = await doFetch();
    if (ttlMs > 0) cache.set(cacheKey, data, ttlMs);
    return data;
  } catch (err) {
    if (!retryOnce) throw err;
    const data = await doFetch();
    if (ttlMs > 0) cache.set(cacheKey, data, ttlMs);
    return data;
  }
}
