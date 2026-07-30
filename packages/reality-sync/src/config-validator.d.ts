export interface ConfigValidationResult {
    valid: boolean;
    errors: ConfigError[];
}
export interface ConfigError {
    rule: string;
    field: string;
    message: string;
}
export interface ConfigData {
    level?: string;
    riskThreshold?: string;
    autoFixCategories?: string[];
    confirmBeforeWrite?: boolean;
    scanners?: Record<string, boolean>;
    [key: string]: unknown;
}
export declare function validate(config: ConfigData, options?: {
    globalConfig?: ConfigData;
    isMember?: boolean;
    context?: string;
}): ConfigValidationResult;
export declare function validateConfigFile(configPath: string, options?: {
    globalConfigPath?: string;
    isMember?: boolean;
}): ConfigValidationResult;
//# sourceMappingURL=config-validator.d.ts.map