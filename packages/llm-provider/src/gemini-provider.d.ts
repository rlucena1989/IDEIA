import { ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse, LLMProvider, LLMProviderConfig } from './index';
export declare class GeminiProvider implements LLMProvider {
    readonly name = "gemini";
    private apiKey;
    private defaultModel;
    private timeout;
    constructor(config: LLMProviderConfig & {
        apiKey: string;
    });
    private buildContents;
    private buildRequestBody;
    chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
    private streamChat;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
}
export declare function createGeminiProvider(config: LLMProviderConfig & {
    apiKey: string;
}): GeminiProvider;
//# sourceMappingURL=gemini-provider.d.ts.map