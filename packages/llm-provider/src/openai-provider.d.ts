import { ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './types';
export declare class OpenAIProvider implements LLMProvider {
    readonly name: string;
    private endpoint;
    private apiKey;
    private defaultModel;
    private timeout;
    constructor(config: LLMProviderConfig & {
        apiKey: string;
        providerName?: string;
    });
    chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
    private streamChat;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
//# sourceMappingURL=openai-provider.d.ts.map