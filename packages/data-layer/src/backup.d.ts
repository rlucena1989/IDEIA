export interface BackupConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    backupDir: string;
    retentionDays: number;
    autoBackup: boolean;
    backupIntervalMs: number;
    compress: boolean;
}
export interface BackupResult {
    success: boolean;
    path: string;
    size: number;
    durationMs: number;
    error?: string;
    timestamp: string;
}
export declare class PostgresBackup {
    private config;
    private intervalId?;
    private backupHistory;
    constructor(config?: Partial<BackupConfig>);
    setConfig(config: Partial<BackupConfig>): void;
    getConfig(): BackupConfig;
    runBackup(): Promise<BackupResult>;
    restore(backupPath: string): Promise<{
        success: boolean;
        error?: string;
    }>;
    listBackups(): BackupResult[];
    startAutoBackup(): void;
    stopAutoBackup(): void;
    private cleanupOldBackups;
}
export declare function createPostgresBackup(config?: Partial<BackupConfig>): PostgresBackup;
//# sourceMappingURL=backup.d.ts.map