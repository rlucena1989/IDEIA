export interface EnvSchema {
    [key: string]: {
        type: 'string' | 'number' | 'boolean' | 'json';
        required?: boolean;
        default?: unknown;
        sensitive?: boolean;
        description?: string;
    };
}
type EnvValue = string | number | boolean | Record<string, unknown> | undefined;
export declare class ConfigManager {
    private static instance;
    private secrets;
    private loaded;
    static getInstance(): ConfigManager;
    private readonly GLOBAL_SCHEMA;
    private constructor();
    init(options?: {
        envFiles?: string[];
        schema?: EnvSchema;
    }): void;
    private loadEnvFile;
    get<T = string>(key: string, fallback?: T): T;
    getSecret(key: string): string | undefined;
    getAll(includeSecrets?: boolean): Record<string, EnvValue>;
    validate(): string[];
    maskSecret(value: string): string;
    getMasked(key: string): string | undefined;
    private cast;
}
export declare const config: ConfigManager;
export {};
//# sourceMappingURL=config-manager.d.ts.map