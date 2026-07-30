export interface VectorRecord {
    id: string;
    vector: number[];
    metadata: Record<string, unknown>;
    content: string;
    createdAt: string;
}
export interface EmbeddingConfig {
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    dimensions?: number;
    timeout?: number;
}
export interface SearchResult {
    record: VectorRecord;
    score: number;
}
export declare function cosineSimilarity(a: number[], b: number[]): number;
export declare function normalizeVector(v: number[]): number[];
export interface EmbeddingProvider {
    embed(text: string): Promise<number[]>;
    readonly dimensions: number;
}
export declare class OllamaEmbeddingProvider implements EmbeddingProvider {
    readonly dimensions: number;
    private baseUrl;
    private model;
    private timeout;
    constructor(config?: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
}
export declare class OpenAIEmbeddingProvider implements EmbeddingProvider {
    readonly dimensions: number;
    private apiKey;
    private baseUrl;
    private model;
    private timeout;
    constructor(config?: EmbeddingConfig);
    embed(text: string): Promise<number[]>;
}
export declare class VectorSearch {
    private records;
    private index;
    private dimensions;
    private embedder?;
    constructor(dimensions?: number, embedder?: EmbeddingProvider);
    setEmbedder(embedder: EmbeddingProvider): void;
    get embedderName(): string;
    get size(): number;
    getDimensions(): number;
    addAsync(content: string, metadata?: Record<string, unknown>, vector?: number[]): Promise<VectorRecord>;
    add(content: string, metadata?: Record<string, unknown>, vector?: number[]): VectorRecord;
    search(query: string | number[], topK?: number, options?: {
        minScore?: number;
        filter?: (m: Record<string, unknown>) => boolean;
    }): SearchResult[];
    searchAsync(query: string, topK?: number, options?: {
        minScore?: number;
        filter?: (m: Record<string, unknown>) => boolean;
    }): Promise<SearchResult[]>;
    get(id: string): VectorRecord | undefined;
    delete(id: string): boolean;
    clear(): void;
    serialize(): string;
    saveToFile(filePath: string): void;
    static loadFromFile(filePath: string, embedder?: EmbeddingProvider): VectorSearch;
    static fromJSON(data: {
        records: VectorRecord[];
        dimensions: number;
    }, embedder?: EmbeddingProvider): VectorSearch;
}
export declare function createVectorSearch(dimensions?: number): VectorSearch;
//# sourceMappingURL=vector-search.d.ts.map