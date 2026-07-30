import { ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './types';
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
//# sourceMappingURL=ollama-provider.d.ts.map