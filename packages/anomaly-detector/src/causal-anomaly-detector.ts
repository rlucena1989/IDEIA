import { CausalGraphNode, CausalAnomalyResult, TrajectoryData, CausalAnomalyConfig } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('causal-anomaly-detector');

class BayesianRiskNetwork {
  private _nodes: Map<string, CausalGraphNode> = new Map();
  private _adjacencyMatrix: number[][] = [];
  private readonly _alpha = 0.01;

  constructor() {
    this._initializeDefaultNodes();
  }

  private _initializeDefaultNodes(): void {
    const defaults: CausalGraphNode[] = [
      { id: 'action_type', type: 'action', observed: true, parents: [], cpt: new Map() },
      { id: 'system_load', type: 'context', observed: true, parents: ['action_type'], cpt: new Map() },
      { id: 'hour_of_day', type: 'context', observed: true, parents: [], cpt: new Map() },
      { id: 'risk_score', type: 'metric', observed: true, parents: ['action_type', 'system_load'], cpt: new Map() },
      { id: 'alert_severity', type: 'metric', observed: true, parents: ['risk_score'], cpt: new Map() },
    ];
    for (const node of defaults) {
      this._nodes.set(node.id, node);
    }
  }

  getNode(id: string): CausalGraphNode | undefined {
    return this._nodes.get(id);
  }

  async estimateMarginal(
    targetVar: string,
    intervention: Map<string, string | number>,
    context: Record<string, number>,
    nSamples = 1000,
  ): Promise<number> {
    const target = this._nodes.get(targetVar);
    if (!target) return 0;

    const parents = target.parents
      .map((p) => this._nodes.get(p))
      .filter((n): n is CausalGraphNode => n !== undefined);
    let marginal = 0;

    for (let s = 0; s < nSamples; s++) {
      let prob = 1;
      for (const parent of parents) {
        const intervened = intervention.get(parent.id);
        if (intervened !== undefined) {
          const key = `${parent.id}=${String(intervened)}`;
          prob *= parent.cpt.get(key) ?? 0.5;
        } else {
          const contextKey = `${parent.id}=${String(context[parent.id] ?? 'unknown')}`;
          prob *= parent.cpt.get(contextKey) ?? 0.5;
        }
      }
      marginal += prob;
    }

    return marginal / nSamples;
  }

  async learnStructure(trajectories: TrajectoryData[]): Promise<void> {
    for (const traj of trajectories) {
      for (let t = 0; t < traj.actions.length; t++) {
        const actionNode = this._ensureNode(traj.actions[t] ?? '', 'action');
        const ctxRecord = traj.contexts[t] ?? {};
        for (const [ctxKey, ctxVal] of Object.entries(ctxRecord)) {
          const ctxNode = this._ensureNode(ctxKey, 'context');
          this._addEdge(ctxNode.id, actionNode.id);
          const key = `${ctxKey}=${String(ctxVal)}`;
          actionNode.cpt.set(key, (actionNode.cpt.get(key) ?? 0) + 1);
        }
      }
    }

    this._normalizeCPTs();
    this._buildAdjacencyMatrix();
  }

  private _ensureNode(id: string, type: CausalGraphNode['type']): CausalGraphNode {
    const existing = this._nodes.get(id);
    if (existing) return existing;
    const node: CausalGraphNode = {
      id,
      type,
      observed: true,
      parents: [],
      cpt: new Map(),
    };
    this._nodes.set(id, node);
    return node;
  }

  private _addEdge(from: string, to: string): void {
    const node = this._nodes.get(to);
    if (node && !node.parents.includes(from)) {
      node.parents.push(from);
    }
  }

  private _normalizeCPTs(): void {
    for (const node of this._nodes.values()) {
      const values = Array.from(node.cpt.values());
      const total = values.reduce((a, b) => a + b, 0) + this._alpha * values.length;
      for (const [key, val] of node.cpt) {
        node.cpt.set(key, (val + this._alpha) / total);
      }
    }
  }

  private _buildAdjacencyMatrix(): void {
    const ids = Array.from(this._nodes.keys());
    const n = ids.length;
    this._adjacencyMatrix = Array.from({ length: n }, () => new Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      const node = this._nodes.get(ids[i] ?? '');
      if (node) {
        for (const parent of node.parents) {
          const j = ids.indexOf(parent);
          if (j >= 0) {
          const row = this._adjacencyMatrix[j];
          if (row) row[i] = 1;
        }
        }
      }
    }
  }
}

export class CausalAnomalyDetector {
  private _bayesianNetwork: BayesianRiskNetwork;
  private _threshold: number;
  private _interventionCosts: Map<string, number>;
  private _config: CausalAnomalyConfig;

  constructor(config?: Partial<CausalAnomalyConfig>) {
    this._bayesianNetwork = new BayesianRiskNetwork();
    this._config = {
      threshold: 0.7,
      nSamples: 1000,
      alpha: 0.01,
      ...config,
    };
    this._threshold = this._config.threshold;
    this._interventionCosts = new Map();
  }

  async detectCausal(
    actionId: string,
    context: Record<string, number>,
  ): Promise<CausalAnomalyResult> {
    const causalEffect = await this._computeCausalEffect(actionId, context);
    const counterfactualRisk = await this._computeCounterfactual(actionId, context);
    const confounding = this._identifyConfounders(actionId);
    const isAnomaly = Math.abs(causalEffect) > this._threshold;

    const interventionPlan = isAnomaly
      ? this._buildInterventionPlan(actionId, confounding)
      : [];

    return {
      actionId,
      causalEffect,
      counterfactualRisk,
      isCausalAnomaly: isAnomaly,
      confoundingFactors: confounding,
      interventionPlan,
    };
  }

  private async _computeCausalEffect(
    actionId: string,
    context: Record<string, number>,
  ): Promise<number> {
    const doNormal = await this._bayesianNetwork.estimateMarginal(
      'risk_score',
      new Map([['action_type', 'normal_execution']]),
      context,
      this._config.nSamples,
    );
    const doAction = await this._bayesianNetwork.estimateMarginal(
      'risk_score',
      new Map([['action_type', actionId]]),
      context,
      this._config.nSamples,
    );
    return doAction - doNormal;
  }

  private async _computeCounterfactual(
    actionId: string,
    context: Record<string, number>,
  ): Promise<number> {
    const factual = await this._bayesianNetwork.estimateMarginal(
      'risk_score',
      new Map<string, string | number>([['action_type', actionId], ['observed_risk', 1]]),
      context,
      this._config.nSamples,
    );
    const counterfactual = await this._bayesianNetwork.estimateMarginal(
      'risk_score',
      new Map([['action_type', 'normal_execution']]),
      context,
      this._config.nSamples,
    );
    return factual - counterfactual;
  }

  private _identifyConfounders(actionId: string): string[] {
    const node = this._bayesianNetwork.getNode(actionId);
    if (!node) return [];

    const confounders: string[] = [];
    for (const parent of node.parents) {
      const parentNode = this._bayesianNetwork.getNode(parent);
      if (parentNode && parentNode.type === 'context') {
        confounders.push(parent);
      }
    }
    return confounders;
  }

  private _buildInterventionPlan(actionId: string, confounders: string[]): string[] {
    const plan: string[] = [];
    for (const conf of confounders) {
      const cost = this._interventionCosts.get(conf) ?? 1;
      plan.push(`do(${conf}=baseline) [cost: ${cost}]`);
    }
    plan.push(`do(${actionId}=blocked) [cost: high]`);
    return plan;
  }

  async learnCausalStructure(trajectories: TrajectoryData[]): Promise<void> {
    await this._bayesianNetwork.learnStructure(trajectories);
  }

  setThreshold(t: number): void {
    this._threshold = t;
  }
}
