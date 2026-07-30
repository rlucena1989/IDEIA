import { ProvenanceEntry, ProvenanceReason, InfluenceGraph, InfluenceNode, InfluenceEdge, SourceType } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('influence-visualizer');

export class InfluenceVisualizer {
  buildGraph(entries: ProvenanceEntry[], llmResponse: string): InfluenceGraph {
    const included = entries.filter(e => e.reason === ProvenanceReason.INCLUDED);
    const nodes: InfluenceNode[] = [];
    const edges: InfluenceEdge[] = [];

    for (const entry of included) {
      const matchedPortions = this._findMatches(llmResponse, entry.source);
      const score = this._calculateAttributionScore(entry, matchedPortions);

      nodes.push({
        id: entry.id,
        source: entry.source,
        sourceType: entry.sourceType,
        score,
        contentHash: entry.contentHash,
        matchedPortions,
      });
    }

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        if (nodes[i].source === nodes[j].source) {
          edges.push({ from: nodes[i].id, to: nodes[j].id, weight: 0.5, relation: 'same_source' });
        }
      }
    }

    const totalInfluence = nodes.reduce((sum, n) => sum + n.score, 0);
    return { nodes, edges, totalInfluence };
  }

  scoreAttribution(
    entries: ProvenanceEntry[],
    responsePortions: Array<{ text: string; source: string }>,
  ): Map<string, number> {
    const scores = new Map<string, number>();

    for (const portion of responsePortions) {
      const matching = entries.filter(e =>
        e.source.toLowerCase().includes(portion.source.toLowerCase()) ||
        portion.source.toLowerCase().includes(e.source.toLowerCase()),
      );

      for (const entry of matching) {
        const current = scores.get(entry.id) ?? 0;
        scores.set(entry.id, current + 1);
      }
    }

    const total = Array.from(scores.values()).reduce((a, b) => a + b, 0) || 1;
    for (const [key, value] of scores) {
      scores.set(key, value / total);
    }

    return scores;
  }

  toMermaid(graph: InfluenceGraph): string {
    const lines = ['graph LR'];
    for (const node of graph.nodes) {
      const label = `${node.source}\\n(${(node.score * 100).toFixed(0)}%)`;
      lines.push(`  ${node.id}["${label}"]`);
    }
    for (const edge of graph.edges) {
      lines.push(`  ${edge.from} -->|${edge.relation}| ${edge.to}`);
    }
    const llmNode = 'llm_response';
    lines.push(`  ${llmNode}["LLM Response"]`);
    for (const node of graph.nodes) {
      lines.push(`  ${node.id} -->|influences| ${llmNode}`);
    }
    return lines.join('\n');
  }

  toMarkdown(graph: InfluenceGraph): string {
    const lines = ['## Influence Graph\n', '### Source Attribution\n',
      '| Source | Type | Score | Matches |', '|--------|------|-------|---------|'];

    for (const node of [...graph.nodes].sort((a, b) => b.score - a.score)) {
      lines.push(`| ${node.source} | ${node.sourceType} | ${(node.score * 100).toFixed(1)}% | ${node.matchedPortions.length} |`);
    }

    lines.push('', `**Total Influence Score:** ${graph.totalInfluence.toFixed(2)}`);
    lines.push(`**Unique Sources:** ${graph.nodes.length}`);
    return lines.join('\n');
  }

  private _findMatches(response: string, source: string): Array<{ start: number; end: number; text: string }> {
    const matches: Array<{ start: number; end: number; text: string }> = [];
    const keywords = source.replace(/[_.-]/g, ' ').split(/\s+/).filter(w => w.length > 3);

    for (const keyword of keywords) {
      const lower = response.toLowerCase();
      const lowerKw = keyword.toLowerCase();
      let idx = 0;
      while ((idx = lower.indexOf(lowerKw, idx)) !== -1) {
        matches.push({ start: idx, end: idx + keyword.length, text: response.substring(idx, idx + keyword.length) });
        idx += keyword.length;
      }
    }

    return matches;
  }

  private _calculateAttributionScore(
    entry: ProvenanceEntry,
    matches: Array<{ start: number; end: number; text: string }>,
  ): number {
    if (matches.length === 0) return 0;
    const baseScore = entry.score || 0.5;
    const matchBonus = Math.min(matches.length / 10, 0.5);
    const positionPenalty = entry.metadata?.position
      ? Math.max(0, 1 - Number(entry.metadata.position) / 100)
      : 1;
    return Math.min(baseScore + matchBonus, 1) * positionPenalty;
  }
}
