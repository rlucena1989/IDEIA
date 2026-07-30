import { ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './types';
export declare class DeepSeekReasoningProvider implements LLMProvider {
    readonly name = "deepseek-reasoning";
    private endpoint;
    private apiKey;
    private defaultModel;
    private timeout;
    constructor(config: LLMProviderConfig & {
        apiKey: string;
    });
    chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
    embed(_request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
//# sourceMappingURL=deepseek-provider.d.ts.map