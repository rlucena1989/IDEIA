import type { LLMProvider, ChatRequest, ChatResponse, EmbeddingRequest, EmbeddingResponse } from './index';
import type { LoRAAdapter, LoRAAdapterStore } from '@ideia/memory-store';
export interface AdapterAwareConfig {
    baseProvider: LLMProvider;
    adapterStore: LoRAAdapterStore;
    projectId: string;
    fallbackToBase: boolean;
}
export declare class AdapterAwareProvider implements LLMProvider {
    readonly name = "adapter-aware";
    private baseProvider;
    private adapterStore;
    private projectId;
    private fallbackToBase;
    private activeAdapter;
    constructor(config: AdapterAwareConfig);
    setProject(projectId: string): Promise<void>;
    getActiveAdapter(): LoRAAdapter | null;
    chat(request: ChatRequest, signal?: AbortSignal): Promise<AsyncIterable<ChatResponse> | ChatResponse>;
    embed(request: EmbeddingRequest): Promise<EmbeddingResponse>;
    private adaptRequest;
    private buildAdapterContext;
}
//# sourceMappingURL=adapter-aware-provider.d.ts.map