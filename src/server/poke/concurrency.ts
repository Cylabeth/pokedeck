/*
 * Normaliza errores:
 * - Si algo lanza un valor que no es instancia de Error (string, unknown, etc.),
 *   lo convertimos a Error para mantener consistencia en rejects.
 */
function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

/*
 * createPool(maxConcurrent):
 * Implementa un pequeño pool de concurrencia (promise queue).
 *
 * Problema que resolvemos:
 * - Promise.all con cientos de requests paralelas contra PokeAPI produce
 *   429 / timeouts intermitentes.
 * - Este pool limita la cantidad de requests activas simultáneamente.
 *
 * Estrategia:
 * - active: número de jobs en ejecución
 * - queue: cola FIFO de trabajos pendientes
 * - next(): si hay capacidad libre, ejecuta el siguiente job
 */
export function createPool(maxConcurrent: number) {
  let active = 0;
  const queue: Array<() => Promise<void>> = [];

  /*
   * next():
   * - Si estamos al máximo de concurrencia, no hace nada
   * - Si hay jobs en cola, ejecuta el siguiente
   * - Cuando el job termina, decrementa active y dispara el siguiente
   */
  const next = () => {
    if (active >= maxConcurrent) return;
    const job = queue.shift();
    if (!job) return;
    active++;
    void job().finally(() => {
      active--;
      next();
    });
  };

  /*
   * run(fn):
   * - Encola el trabajo
   * - Devuelve una Promise que se resolverá cuando el job sea ejecutado
   * - Permite usar el pool como:
   *
   *     pool(async () => fetchSomething())
   */
  return async function run<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(async () => {
        try {
          resolve(await fn());
        } catch (err) {
          reject(toError(err));
        }
      });
      next();
    });
  };
}
