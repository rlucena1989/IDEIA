import { createLogger } from '@ideia/logger';
const logger = createLogger('fetch-with-timeout');

export interface FetchOptions {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

const DEFAULT_OPTIONS: Required<FetchOptions> = {
  timeout: 10000,
  retries: 2,
  retryDelay: 1000,
};

export async function fetchWithTimeout(
  url: string,
  options: RequestInit & FetchOptions = {},
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), config.timeout);

  const fetchOpts: RequestInit = {
    ...options,
    signal: options.signal ?? controller.signal,
  };

  try {
    return await fetch(url, fetchOpts);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchWithRetry(
  url: string,
  options: RequestInit & FetchOptions = {},
): Promise<Response> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      return await fetchWithTimeout(url, options);
    } catch (_err) {
      lastError = _err instanceof Error ? _err : new Error(String(_err));
      if (attempt < config.retries) {
        logger.warn(`Retry ${attempt + 1}/${config.retries} for ${url.slice(0, 100)}: ${lastError.message}`);
        await new Promise(r => setTimeout(r, config.retryDelay * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new Error(`Failed to fetch ${url}`);
}
