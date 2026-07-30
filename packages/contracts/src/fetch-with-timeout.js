"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchWithTimeout = fetchWithTimeout;
exports.fetchWithRetry = fetchWithRetry;
const logger_1 = require("@ideia/logger");
const logger = (0, logger_1.createLogger)('fetch-with-timeout');
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
        catch (_err) {
            lastError = _err instanceof Error ? _err : new Error(String(_err));
            if (attempt < config.retries) {
                logger.warn(`Retry ${attempt + 1}/${config.retries} for ${url.slice(0, 100)}: ${lastError.message}`);
                await new Promise(r => setTimeout(r, config.retryDelay * Math.pow(2, attempt)));
            }
        }
    }
    throw lastError ?? new Error(`Failed to fetch ${url}`);
}
//# sourceMappingURL=fetch-with-timeout.js.map