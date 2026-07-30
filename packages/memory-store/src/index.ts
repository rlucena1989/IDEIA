export { createMemoryRecord, MemoryStore } from './memory-store';
export type { MemoryRecord, MemoryCategory, MemoryState } from './memory-store';

export { VectorSearch, createVectorSearch, cosineSimilarity, normalizeVector, OllamaEmbeddingProvider, OpenAIEmbeddingProvider } from './vector-search';
export type { VectorRecord, SearchResult, EmbeddingProvider, EmbeddingConfig } from './vector-search';

export { KnowledgeGraph } from './knowledge-graph';
export type { GraphNode, GraphEdge, ImpactAnalysis } from './knowledge-graph';

export { PatternDetector } from './pattern-detector';
export type { DetectedPattern, PatternDetectorConfig } from './pattern-detector';

export { CagCache } from './cag-cache';
export type { CagEntry, CagStats } from './cag-cache';

export { CrossProjectLearner, createCrossProjectLearner } from './cross-project-learner';
export type { ProjectProfile, ProjectDecision, CrossProjectInsight, CrossProjectRecommendation } from './cross-project-learner';

export { buildChatContext, buildChatContextWithCag } from './chat-integration';
export type { ChatContext } from './chat-integration';

export { LlmLearningEngine, LearningRecommendation } from './llm-learning-engine';
export type { LearningEngineConfig } from './llm-learning-engine';

export { LoRAAdapterStore } from './lora-adapter-store';
export type { LoRAAdapter, AdapterDiff } from './lora-adapter-store';
