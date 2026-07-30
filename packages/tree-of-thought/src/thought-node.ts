import { ThoughtState, EvaluationScore, PlannedStep, ThoughtStatus } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('thought-node');

export interface ScoredPath {
  path: ThoughtNode[];
  score: number;
}

export interface DecompositionResult {
  steps: PlannedStep[];
  rootNode: ThoughtNode;
  pathsExplored: number;
  nodesGenerated: number;
  strategy: string;
  score: number;
  isAcyclic: boolean;
  executionTime: number;
  costBreakdown: {
    tokens: number;
    llmCalls: number;
    estimatedSeconds: number;
  };
}

export class ThoughtNode {
  public id: string;
  public parentId: string | null;
  public content: string;
  public state: ThoughtStatus;
  public value: number;
  public visits: number;
  public children: ThoughtNode[];
  public depth: number;
  public metadata: {
    strategy: string;
    coverage: number;
    granularity: number;
    cost: number;
    isAcyclic: boolean;
    timestamp: number;
    heuristicScores: Record<string, number>;
  };

  constructor(
    id: string,
    content: string,
    depth: number,
    parent?: ThoughtNode
  ) {
    this.id = id;
    this.parentId = parent ? parent.id : null;
    this.content = content;
    this.state = ThoughtState.ACTIVE;
    this.value = 0;
    this.visits = 0;
    this.children = [];
    this.depth = depth;
    this.metadata = {
      strategy: '',
      coverage: 0,
      granularity: 0,
      cost: 0,
      isAcyclic: true,
      timestamp: Date.now(),
      heuristicScores: {},
    };
  }

  addChild(child: ThoughtNode): void {
    child.parentId = this.id;
    this.children.push(child);
  }

  get pathToRoot(): ThoughtNode[] {
    // This requires external traversal — simplified: returns node only
    return [this];
  }

  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  get avgValue(): number {
    if (this.visits === 0) return this.value;
    return this.value / this.visits;
  }

  updateWithEvaluation(score: EvaluationScore): void {
    this.state = ThoughtState.EVALUATED;
    this.value = (score.total ?? score.score ?? 0);
    this.metadata.coverage = score.coverage ?? 0;
    this.metadata.granularity = score.granularity ?? 0;
    this.metadata.isAcyclic = (score.acyclicity ?? 0) >= 0.8;
    this.metadata.cost = score.cost ?? 0;
    this.metadata.heuristicScores = {
      coverage: score.coverage ?? 0,
      granularity: score.granularity ?? 0,
      acyclicity: score.acyclicity ?? 0,
      cost: score.cost ?? 0,
    };
  }

  static createRoot(goalDescription: string): ThoughtNode {
    const node = new ThoughtNode('root', goalDescription, 0);
    node.metadata.strategy = 'root';
    return node;
  }
}
