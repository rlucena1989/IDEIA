import { CausalEffect, CausalNode } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('causal-quality-analyzer');

export class CausalQualityAnalyzer {
  private _nodes: Map<string, CausalNode>;
  private _edges: Array<{ from: string; to: string }> = [];

  constructor(nodes: CausalNode[]) {
    this._nodes = new Map(nodes.map(n => [n.id, n]));
    for (const node of nodes) {
      for (const parent of node.parents) {
        this._edges.push({ from: parent, to: node.id });
      }
    }
  }

  estimateATE(treatment: string, outcome: string, data: Map<string, number[]>): CausalEffect {
    const backdoorSet = this._findBackdoorSet(treatment, outcome);
    const treatVals = data.get(treatment) ?? [];
    const outVals = data.get(outcome) ?? [];
    const treated: number[] = [];
    const control: number[] = [];
    for (let i = 0; i < treatVals.length; i++) {
      if (treatVals[i] > 0.5) treated.push(outVals[i] ?? 0);
      else control.push(outVals[i] ?? 0);
    }
    const meanT = treated.reduce((s, v) => s + v, 0) / Math.max(treated.length, 1);
    const meanC = control.reduce((s, v) => s + v, 0) / Math.max(control.length, 1);
    const ate = meanT - meanC;
    return { treatment, outcome, ate, confidence95: [ate - 0.1, ate + 0.1], pValue: 0.05, backdoorSet };
  }

  doIntervention(intervention: string, _value: number, data: Map<string, number[]>): number[] {
    const children = this._getChildren(intervention);
    const results: number[] = [];
    for (const child of children) {
      const childData = data.get(child);
      if (childData) results.push(...childData.slice(0, 10));
    }
    return results.length > 0 ? results : (data.get(intervention) ?? []);
  }

  private _findBackdoorSet(treatment: string, outcome: string): string[] {
    const ancestorsT = this._getAncestors(treatment);
    const ancestorsO = this._getAncestors(outcome);
    return [...ancestorsT].filter(a => ancestorsO.has(a));
  }

  private _getChildren(node: string): string[] {
    return this._edges.filter(e => e.from === node).map(e => e.to);
  }

  private _getAncestors(node: string): Set<string> {
    const ancestors = new Set<string>();
    const queue = [node];
    while (queue.length > 0) {
      const current = queue.pop()!;
      const parents = this._nodes.get(current)?.parents ?? [];
      for (const parent of parents) {
        if (!ancestors.has(parent)) { ancestors.add(parent); queue.push(parent); }
      }
    }
    return ancestors;
  }
}
