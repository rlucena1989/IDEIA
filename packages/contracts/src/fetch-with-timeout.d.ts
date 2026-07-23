export interface FetchOptions {
    timeout?: number;
    retries?: number;
    retryDelay?: number;
}
export declare function fetchWithTimeout(url: string, options?: RequestInit & FetchOptions): Promise<Response>;
export declare function fetchWithRetry(url: string, options?: RequestInit & FetchOptions): Promise<Response>;
//# sourceMappingURL=fetch-with-timeout.d.ts.map