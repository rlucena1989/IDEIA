export interface Pendencia {
    id: string;
    severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
    category: string;
    checkName: string;
    message: string;
    filePath?: string;
    line?: number;
    suggestedFix?: string;
    autoFixCommand?: string;
    createdAt: string;
    resolvedAt?: string;
    status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
    source: 'continuous' | 'manual' | 'ci';
}
export declare class PendenciaStore {
    private filePath;
    constructor(filePath: string);
    append(p: Omit<Pendencia, 'id' | 'createdAt'>): Pendencia;
    load(): Pendencia[];
    query(filter: Partial<Pendencia>): Pendencia[];
    resolve(id: string): boolean;
    count(): {
        open: number;
        bySeverity: Record<string, number>;
    };
}
//# sourceMappingURL=pendencia-store.d.ts.map