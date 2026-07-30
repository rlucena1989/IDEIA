import type { FullConfig, ImportResult } from './types';
import type { ConfigEngine } from './config-engine';
export declare function exportConfig(engine: ConfigEngine, scope: 'global' | 'project' | 'all', anonymized?: boolean): string;
export declare function exportToFile(engine: ConfigEngine, filePath: string, scope?: 'global' | 'project' | 'all', anonymized?: boolean): Promise<void>;
export declare function exportWithProfile(engine: ConfigEngine, profileId: string, anonymized?: boolean): string;
export declare function exportSummary(config: FullConfig): {
    keyCount: number;
    categories: string[];
    sensitiveKeys: number;
    sizeBytes: number;
};
export declare function importConfig(engine: ConfigEngine, data: string, dryRun?: boolean, validateOnly?: boolean): Promise<ImportResult>;
//# sourceMappingURL=config-export.d.ts.map