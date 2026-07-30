import { ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './types';
export declare class OpenAIReasoningProvider implements LLMProvider {
    readonly name = "openai-reasoning";
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
//# sourceMappingURL=openai-reasoning-provider.d.ts.map