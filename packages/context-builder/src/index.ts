export { ContextComposer } from './composer';
export { ContextAggregator } from './aggregator';
export type { SourceProvider } from './aggregator';
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

import { ContextComposer } from './composer';
import { ContextComposerConfig } from './types';

export function createContextComposer(config?: Partial<ContextComposerConfig>): ContextComposer {
  return new ContextComposer(config);
}
