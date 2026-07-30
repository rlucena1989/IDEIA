import { LLMProvider } from './types';
export declare const UNIVERSAL_ENDPOINTS: Array<{
    name: string;
    endpoint: string;
    defaultModel: string;
    envKey?: string;
}>;
export declare const REASONING_ENDPOINTS: Array<{
    name: string;
    endpoint: string;
    defaultModel: string;
    envKey: string;
}>;
export declare class ProviderRouter {
    private providers;
    register(provider: LLMProvider): void;
    setPriority(names: string[]): void;
    getActive(): LLMProvider;
    getProvider(name: string): LLMProvider | undefined;
    listProviders(): string[];
}
export declare function createDefaultRouter(): ProviderRouter;
//# sourceMappingURL=provider-router.d.ts.map