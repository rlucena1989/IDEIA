export declare function safeJsonParse<T>(text: string, fallback: T): T;
export declare function safeJsonParseWithSchema<T>(text: string, schema: {
    parse: (data: unknown) => T;
}, fallback: T): T;
//# sourceMappingURL=safe-json.d.ts.map