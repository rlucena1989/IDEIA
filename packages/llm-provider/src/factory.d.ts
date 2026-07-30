import { LLMProvider, LLMProviderConfig } from './types';
export declare const KNOWN_PROVIDERS: Record<string, {
    name: string;
    defaultModel: string;
    chatOnly?: boolean;
}>;
export declare function createProvider(config: LLMProviderConfig & {
    apiKey?: string;
    reasoning?: boolean;
}): LLMProvider;
export declare function createProviderFromEnv(): LLMProvider;
//# sourceMappingURL=factory.d.ts.map