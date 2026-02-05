function toError(err: unknown): Error {
  return err instanceof Error ? err : new Error(String(err));
}

export function createPool(maxConcurrent: number) {
  let active = 0;
  const queue: Array<() => Promise<void>> = [];

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
