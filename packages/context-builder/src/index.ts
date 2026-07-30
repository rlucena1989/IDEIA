export { ContextComposer } from './composer';
export { ContextAggregator } from './aggregator';
export type { SourceProvider } from './aggregator';
export { RepoMapGenerator } from './repo-map-generator';
export type { RepoMap, RepoNode, RepoMapOptions } from './repo-map-generator';
export { RelevanceScorer } from './scorer';
export { ContextDeduplicator } from './deduplicator';
export { ContextProvenance } from './provenance';
export { ContextSerializer } from './serializer';
export type { SerializationFormat } from './serializer';

export type {
  TaskProfile,
  ContextSource,
  ContextItem,
  ScoredContextItem,
  ProvenanceEntry,
  ComposedContext,
  ContextComposerConfig,
  ContextAggregatorResult,
} from './types';

export { NeedDeclarer } from './need-declarer';
export { TokenAllocator } from './token-allocator';
export { PriorityManager } from './priority-manager';
export { DynamicRenegotiator } from './dynamic-renegotiator';
export { BudgetNegotiator } from './budget-negotiator';

export type {
  CompressionLevel,
  SourceNeed,
  Allocation,
  UsageReport,
  CompressedContext,
  BudgetNegotiatorOptions,
} from './types-budget';

import { ContextComposer } from './composer';
import { createLogger } from '@ideia/logger';
import { ContextComposerConfig } from './types';
const logger = createLogger('index');

export function createContextComposer(config?: Partial<ContextComposerConfig>): ContextComposer {
  return new ContextComposer(config);
}
