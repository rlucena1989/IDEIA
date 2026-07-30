export async function runInParallel<T, R>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = [];
  const queue = [...items];

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const item = queue.shift() as T;
      const index = items.indexOf(item);
      results[index] = await fn(item);
    }
  };

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);

  return results;
}

export function isWorkerThreadsAvailable(): boolean {
  try {
    require.resolve('worker_threads');
    return true;
  } catch {
    return false;
  }
}

export async function runInWorkerThreads<T extends Record<string, unknown>, R>(
  items: T[],
  workerFile: string,
  options?: { maxWorkers?: number }
): Promise<R[]> {
  const maxWorkers = options?.maxWorkers ?? Math.min(4, items.length);
  if (!isWorkerThreadsAvailable() || items.length === 0) {
    return [];
  }

  try {
    const { Worker } = await require('worker_threads');
    const results: R[] = [];
    const queue = [...items];
    let nextIndex = 0;

    const spawnWorker = async (): Promise<void> => {
      while (queue.length > 0) {
        const item = queue.shift() as T;
        const index = nextIndex++;
        await new Promise<void>((resolve, reject) => {
          const worker = new Worker(workerFile, {
            workerData: item,
            eval: false,
          });
          worker.on('message', (msg: R) => {
            results[index] = msg;
            resolve();
          });
          worker.on('error', reject);
          worker.on('exit', (code: number) => {
            if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
          });
        });
      }
    };

    const workers = Array.from({ length: Math.min(maxWorkers, items.length) }, () => spawnWorker());
    await Promise.all(workers);
    return results;
  } catch {
    return [];
  }
}

export function createMathWorkerContent(): string {
  return `
const { parentPort, workerData } = require('worker_threads');
const { operation, data } = workerData;
let result;
switch (operation) {
  case 'sum': result = data.reduce((a, b) => a + b, 0); break;
  case 'mean': result = data.reduce((a, b) => a + b, 0) / data.length; break;
  case 'stddev': { const m = data.reduce((a, b) => a + b, 0) / data.length; result = Math.sqrt(data.reduce((s, v) => s + (v - m) ** 2, 0) / data.length); break; }
  case 'min': result = Math.min(...data); break;
  case 'max': result = Math.max(...data); break;
  default: result = null;
}
parentPort.postMessage(result);
`;
}

export async function runMathInWorker(operation: string, data: number[]): Promise<number | null> {
  if (!isWorkerThreadsAvailable()) return null;
  try {
    const { Worker } = await require('worker_threads');
    return await new Promise((resolve, reject) => {
      const worker = new Worker(createMathWorkerContent(), {
        eval: true,
        workerData: { operation, data },
      });
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code: number) => {
        if (code !== 0) reject(new Error(`Worker exited with code ${code}`));
      });
    });
  } catch {
    return null;
  }
}
