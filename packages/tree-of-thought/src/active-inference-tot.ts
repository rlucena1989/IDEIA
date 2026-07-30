import { Goal, ThoughtState, FreeEnergyComponents } from './types';
import { createLogger } from '@ideia/logger';
import { ThoughtNode } from './thought-node';
import { ThoughtPath } from './thought-path';
import { HeuristicScorer } from './heuristic-scorer';
import { generateThoughts } from './beam-search';
const logger = createLogger('active-inference-tot');

export class ActiveInferenceToT {
  private readonly _explorationWeight = 0.5;
  private readonly _horizon = 3;
  private _scorer: HeuristicScorer;

  constructor(scorer?: HeuristicScorer) {
    this._scorer = scorer || new HeuristicScorer();
  }

  async search(goal: string, horizon?: number): Promise<ThoughtPath> {
    const h = horizon ?? this._horizon;
    const root = this._createRoot(goal);
    const path: ThoughtNode[] = [root];
    let current = root;

    for (let step = 0; step < h; step++) {
      const goalObj: Goal = {
        id: 'ai-goal',
        description: goal,
        type: 'feature',
        complexity: 0.5,
        urgency: 0.5,
        risk: 0.3,
        domain: 'general',
        constraints: [],
        context: {},
      };

      const candidates = generateThoughts(goalObj, current, 4);

      const evaluated = candidates.map(c => ({
        node: c,
        freeEnergy: this.expectedFreeEnergy(c),
      }));

      const selected = this._selectByFreeEnergy(evaluated);

      this._scorer.evaluate(selected.node, goalObj);
      selected.node.state = ThoughtState.SELECTED;
      current.children.push(selected.node);
      current = selected.node;
      path.push(selected.node);
    }

    const avgScore = path.reduce((s, n) => s + n.value, 0) / path.length;
    return new ThoughtPath(path, avgScore);
  }

  expectedFreeEnergy(thought: ThoughtNode): FreeEnergyComponents {
    const pragmatic = this._computePragmaticValue(thought);
    const epistemic = this._computeEpistemicValue(thought);
    const ambiguity = 1 - (thought.metadata?.coverage || 0.5);
    const risk = this._computeRisk(thought);
    const total = risk + this._explorationWeight * ambiguity;

    return { epistemic, pragmatic, total, ambiguity, risk };
  }

  private _selectByFreeEnergy(
    candidates: Array<{ node: ThoughtNode; freeEnergy: FreeEnergyComponents }>
  ): { node: ThoughtNode; freeEnergy: FreeEnergyComponents } {
    return candidates.reduce((best, c) =>
      c.freeEnergy.total < best.freeEnergy.total ? c : best
    );
  }

  private _computePragmaticValue(thought: ThoughtNode): number {
    const coverage = thought.metadata?.coverage || 0;
    const granularity = thought.metadata?.granularity || 0;
    return (coverage + granularity) / 2;
  }

  private _computeEpistemicValue(thought: ThoughtNode): number {
    const currentUncertainty = thought.parentId ? 0.5 : 1.0;
    const words = thought.content.toLowerCase().split(/\s+/);
    const thoughtSpecificity = new Set(words).size / Math.max(words.length, 1);
    const infoGain = currentUncertainty * (1 - thoughtSpecificity);
    return infoGain;
  }

  private _computeRisk(thought: ThoughtNode): number {
    const priorBelief = 0.5;
    const posterior = thought.value || 0.3;
    const klDiv = posterior * Math.log((posterior + 0.0001) / (priorBelief + 0.0001))
      + (1 - posterior) * Math.log((1 - posterior + 0.0001) / (1 - priorBelief + 0.0001));
    return Math.min(1, klDiv);
  }

  private _createRoot(goal: string): ThoughtNode {
    const root = new ThoughtNode('root', goal, 0);
    root.metadata.strategy = 'active-inference';
    return root;
  }
}
