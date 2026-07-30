import { ComplexityLevel, ComplexityCriteria, RoutePipeline, AgentOpinion, ConsensusResult, FusionInput, FusionResult } from './types';
import { createLogger } from '@ideia/logger';
import { ComplexityClassifier } from './complexity-classifier';
import { RouteSelector } from './route-selector';
import { ConsensusEngine } from './consensus-engine';
import { FusionEngine } from './fusion-engine';

export interface AgentRouterConfig {
  defaultLevel: ComplexityLevel;
}

const DEFAULT_CONFIG: AgentRouterConfig = { defaultLevel: 'N2' };

export class AgentRouter {
  readonly classifier: ComplexityClassifier;
  readonly routeSelector: RouteSelector;
  readonly consensusEngine: ConsensusEngine;
  readonly fusionEngine: FusionEngine;
  readonly config: AgentRouterConfig;

  constructor(config?: Partial<AgentRouterConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.classifier = new ComplexityClassifier();
    this.routeSelector = new RouteSelector();
    this.consensusEngine = new ConsensusEngine();
    this.fusionEngine = new FusionEngine();
  }

  classify(criteria: ComplexityCriteria) {
    return this.classifier.classify(criteria);
  }

  selectRoute(level: ComplexityLevel) {
    return this.routeSelector.select(level);
  }

  resolveConsensus(opinions: AgentOpinion[]) {
    return this.consensusEngine.reachConsensus(opinions);
  }

  fuseResults(inputs: FusionInput[]) {
    return this.fusionEngine.fuse(inputs);
  }

  getPipelineForCriteria(criteria: ComplexityCriteria): { classification: ReturnType<AgentRouter['classify']>; pipeline: RoutePipeline } {
    const classification = this.classifier.classify(criteria);
    const pipeline = this.routeSelector.select(classification.level);
    return { classification, pipeline };
  }
}

export function createAgentRouter(config?: Partial<AgentRouterConfig>): AgentRouter {
  return new AgentRouter(config);
}
