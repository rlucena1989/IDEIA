import { Goal, ThoughtState, ThoughtStrategy, SearchConfig } from './types';
import { createLogger } from '@ideia/logger';
import { ThoughtNode } from './thought-node';
import { HeuristicScorer } from './heuristic-scorer';
const logger = createLogger('beam-search');

const STRATEGIES: ThoughtStrategy[] = [
  'top-down', 'bottom-up', 'lateral-thinking', 'first-principles',
];

function _getStrategiesForGoal(goal: Goal): ThoughtStrategy[] {
  const base = [...STRATEGIES];
  if (goal.type === 'bugfix') base.push('diagnostic');
  if (goal.type === 'feature') base.push('compositional');
  return base.sort(() => Math.random() - 0.5);
}

function _generateThoughtContent(goal: Goal, strategy: ThoughtStrategy, depth: number): string {
  return HeuristicScorer.fallbackGenerate(goal, strategy, depth);
}

function _createNode(content: string, strategy: ThoughtStrategy, depth: number, parent?: ThoughtNode): ThoughtNode {
  const node = new ThoughtNode(
    `n_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    content,
    depth,
    parent,
  );
  node.metadata.strategy = strategy;
  node.metadata.timestamp = Date.now();
  return node;
}

export function generateThoughts(goal: Goal, parent?: ThoughtNode, count: number = 3): ThoughtNode[] {
  const thoughts: ThoughtNode[] = [];
  const strategies = _getStrategiesForGoal(goal);
  const depth = (parent ? parent.depth : 0) + 1;

  for (let i = 0; i < count; i++) {
    const strategy = strategies[i % strategies.length];
    const content = _generateThoughtContent(goal, strategy, depth);
    const node = _createNode(content, strategy, depth, parent);
    thoughts.push(node);
  }

  return thoughts;
}

export class BeamSearch {
  private _scorer: HeuristicScorer;

  constructor(scorer?: HeuristicScorer) {
    this._scorer = scorer || new HeuristicScorer();
  }

  async explore(root: ThoughtNode, goal: Goal, config: SearchConfig): Promise<ThoughtNode[]> {
    let beam: ThoughtNode[] = [root];

    for (let depth = 0; depth < config.maxDepth; depth++) {
      const candidates: ThoughtNode[] = [];

      for (const node of beam) {
        const children = generateThoughts(goal, node, config.branchingFactor);
        const scores = this._scorer.evaluateBatch(children, goal);

        const threshold = config.pruningThreshold ?? 0.1;
        const valid = children.filter(
          c => (scores.get(c.id)?.total || 0) > threshold
        );

        for (const child of valid) {
          child.state = ThoughtState.EVALUATED;
          node.children.push(child);
        }

        candidates.push(...valid);
      }

      if (candidates.length === 0) break;

      candidates.sort((a, b) => b.value - a.value);
      beam = candidates.slice(0, config.beamWidth);

      for (const node of beam) {
        node.state = ThoughtState.SELECTED;
      }
    }

    return beam;
  }
}
