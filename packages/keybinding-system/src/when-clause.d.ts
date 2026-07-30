export declare class WhenClauseEvaluator {
    private contextKeys;
    setContext(key: string, value: unknown): void;
    getContext(key: string): unknown;
    evaluate(expression: string, activeContexts?: string[]): boolean;
    private tokenize;
    private evaluateTokens;
}
//# sourceMappingURL=when-clause.d.ts.map