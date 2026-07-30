import { Goal, ThoughtState } from './types';
import { createLogger } from '@ideia/logger';
import { ThoughtNode } from './thought-node';
import { ThoughtPath } from './thought-path';
import { HeuristicScorer } from './heuristic-scorer';
import { generateThoughts } from './beam-search';
import { ValueNetwork } from './value-network';
const logger = createLogger('neural-mcts');

export class NeuralMCTS {
  private _valueNetwork: ValueNetwork;
  private _scorer: HeuristicScorer;
  private _replayBuffer: Array<{ input: import('./types').ValueNetworkInput; target: number }> = [];

  constructor(scorer?: HeuristicScorer) {
    this._valueNetwork = new ValueNetwork();
    this._scorer = scorer || new HeuristicScorer();
  }

  async search(root: ThoughtNode, simulations: number): Promise<ThoughtPath> {
    for (let i = 0; i < simulations; i++) {
      const leaf = this._select(root, 1.41);

      if (leaf.depth < 5 && leaf.children.length === 0) {
        const subGoal: Goal = {
          id: 'mcts-goal',
          description: leaf.content,
          type: 'feature',
          complexity: 0.5,
          urgency: 0.5,
          risk: 0.3,
          domain: 'general',
          constraints: [],
          context: {},
        };
        const children = generateThoughts(subGoal, leaf, 3);

        for (const child of children) {
          this._scorer.evaluate(child, subGoal);
          leaf.children.push(child);
        }
      }

      const nodeToEval = leaf.children.length > 0
        ? leaf.children[Math.floor(Math.random() * leaf.children.length)]
        : leaf;

      const reward = this._simulateWithValueNetwork(nodeToEval);

      this._backpropagate(nodeToEval, reward);
    }

    return this._extractBestPath(root);
  }

  private _select(node: ThoughtNode, C: number): ThoughtNode {
    let current = node;
    let maxIterations = 100;

    while (current.children.length > 0 && maxIterations > 0) {
      maxIterations--;
      current = current.children.reduce((best, child) => {
        const ucbScore = this._neuralUCB1(child, C, current.visits);
        const bestUcb = this._neuralUCB1(best, C, current.visits);
        return ucbScore > bestUcb ? child : best;
      });
    }

    return current;
  }

  private _neuralUCB1(node: ThoughtNode, C: number, parentVisits: number): number {
    if (node.visits === 0) return Infinity;

    const exploitation = node.value / node.visits;
    const exploration = C * Math.sqrt(Math.log(parentVisits + 1) / node.visits);
    const neuralPrior = this._valueNetwork.forward({
      thoughtEmbedding: ValueNetwork.simpleEmbed(node.content),
      goalEmbedding: ValueNetwork.simpleEmbed(node.metadata?.strategy || ''),
      depthNormalized: node.depth / 10,
      branchPosition: node.metadata?.coverage || 0.5,
      parentValue: node.value,
    });

    return exploitation + exploration + 0.1 * neuralPrior;
  }

  expand(node: ThoughtNode): ThoughtNode[] {
    return node.children;
  }

  private _simulateWithValueNetwork(node: ThoughtNode): number {
    const prediction = this._valueNetwork.forward({
      thoughtEmbedding: ValueNetwork.simpleEmbed(node.content),
      goalEmbedding: ValueNetwork.simpleEmbed(node.metadata?.strategy || ''),
      depthNormalized: node.depth / 10,
      branchPosition: node.metadata?.coverage || 0.5,
      parentValue: node.parentId ? node.value : 0,
    });

    this._replayBuffer.push({
      input: {
        thoughtEmbedding: ValueNetwork.simpleEmbed(node.content),
        goalEmbedding: ValueNetwork.simpleEmbed(node.metadata?.strategy || ''),
        depthNormalized: node.depth / 10,
        branchPosition: node.metadata?.coverage || 0.5,
        parentValue: node.parentId ? node.value : 0,
      },
      target: node.value,
    });

    if (this._replayBuffer.length >= 32) {
      const batch = this._replayBuffer.splice(0, 32);
      this._valueNetwork.train(batch.map(b => ({
        input: b.input,
        target: b.target,
      })));
    }

    return prediction;
  }

  private _backpropagate(node: ThoughtNode, reward: number): void {
    let current: ThoughtNode | undefined = node;
    while (current) {
      current.visits++;
      current.value = (
        (current.value * (current.visits - 1)) + reward
      ) / current.visits;
      current = current.children.length > 0 ? current.children[0] : undefined;
    }
  }

  private _extractBestPath(root: ThoughtNode): ThoughtPath {
    const path: ThoughtNode[] = [];
    let current = root;

    while (current.children.length > 0) {
      current = current.children.reduce((best, child) =>
        child.visits > best.visits ? child : best
      );
      path.push(current);
    }

    const avgScore = path.length > 0
      ? path.reduce((s, n) => s + n.value, 0) / path.length
      : 0;

    return new ThoughtPath(path, avgScore);
  }
}
