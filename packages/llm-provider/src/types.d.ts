export interface ChatMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCalls?: Array<{
        id: string;
        name: string;
        arguments: Record<string, unknown>;
    }>;
    id?: string;
    timestamp?: string;
    metadata?: Record<string, unknown>;
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
//# sourceMappingURL=types.d.ts.map