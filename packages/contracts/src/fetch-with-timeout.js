"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithTimeout = fetchWithTimeout;
exports.fetchWithRetry = fetchWithRetry;
const DEFAULT_OPTIONS = {
    timeout: 10000,
    retries: 2,
    retryDelay: 1000,
};
async function fetchWithTimeout(url, options = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), config.timeout);
    const fetchOpts = {
        ...options,
        signal: options.signal ?? controller.signal,
    };
    try {
        return await fetch(url, fetchOpts);
    }
    finally {
        clearTimeout(timeoutId);
    }
}
async function fetchWithRetry(url, options = {}) {
    const config = { ...DEFAULT_OPTIONS, ...options };
    let lastError = null;
    for (let attempt = 0; attempt <= config.retries; attempt++) {
        try {
            return await fetchWithTimeout(url, options);
        }
        catch (err) {
            lastError = err instanceof Error ? err : new Error(String(err));
            if (attempt < config.retries) {
                console.warn(`[fetch] Retry ${attempt + 1}/${config.retries} for ${url.slice(0, 100)}: ${lastError.message}`);
                await new Promise(r => setTimeout(r, config.retryDelay * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError ?? new Error(`Failed to fetch ${url}`);
}
//# sourceMappingURL=fetch-with-timeout.js.map