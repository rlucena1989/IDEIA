export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
    }>;
}
export interface ChatRequest {
    model: string;
    messages: ChatMessage[];
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
}
export interface ChatResponse {
    content: string;
    model: string;
    provider: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}
export interface EmbeddingRequest {
    model: string;
    input: string | string[];
}
export interface EmbeddingResponse {
    embeddings: number[][];
    model: string;
    provider: string;
    usage?: {
        promptTokens: number;
        totalTokens: number;
    };
}
export interface LLMProviderConfig {
    endpoint: string;
    apiKey?: string;
    defaultModel?: string;
    timeout?: number;
}
export interface LLMProvider {
    readonly name: string;
    chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
export declare class OllamaProvider implements LLMProvider {
    readonly name = "ollama";
    private endpoint;
    private defaultModel;
    private timeout;
    constructor(config: LLMProviderConfig);
    chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
    private streamChat;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
export declare class OpenAIProvider implements LLMProvider {
    readonly name = "openai";
    private endpoint;
    private apiKey;
    private defaultModel;
    private timeout;
    constructor(config: LLMProviderConfig & {
        apiKey: string;
    });
    chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
    private streamChat;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
export declare function createProvider(config: LLMProviderConfig & {
    apiKey?: string;
}): LLMProvider;
export declare function createProviderFromEnv(): LLMProvider;
export declare class ProviderRouter {
    private providers;
    register(provider: LLMProvider): void;
    setPriority(names: string[]): void;
    getActive(): LLMProvider;
    getProvider(name: string): LLMProvider | undefined;
    listProviders(): string[];
}
export declare function createDefaultRouter(): ProviderRouter;
//# sourceMappingURL=index.d.ts.map