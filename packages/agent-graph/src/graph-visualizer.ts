import { DAGExecution } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('graph-visualizer');

export class GraphVisualizer {
  private execution: DAGExecution | null = null;

  setExecution(exec: DAGExecution): void {
    this.execution = exec;
  }

  showGraph(): string {
    if (!this.execution) return 'No execution data';

    const lines: string[] = [
      `# DAG Graph: ${this.execution.id}`,
      `# Task: ${this.execution.task.slice(0, 60)}`,
      '',
    ];

    const nodeMap = new Map(this.execution.nodes.map(n => [n.id, n]));
    const statusEmoji: Record<string, string> = {
      pending: '[ ]',
      running: '[~]',
      completed: '[✓]',
      failed: '[✗]',
      skipped: '[-]',
      paused: '[‖]',
      cancelled: '[×]',
    };

    for (const edge of this.execution.edges) {
      const fromNode = nodeMap.get(edge.from);
      const toNode = nodeMap.get(edge.to);
      const fromStatus = fromNode ? (statusEmoji[fromNode.status] ?? '[?]') : '[?]';
      const toStatus = toNode ? (statusEmoji[toNode.status] ?? '[?]') : '[?]';
      const fromLabel = fromNode ? fromNode.role : edge.from;
      const toLabel = toNode ? toNode.role : edge.to;
      lines.push(`  ${fromStatus} ${fromLabel} ──→ ${toStatus} ${toLabel}`);
    }

    lines.push('');

    if (this.execution.currentNodeId) {
      const current = nodeMap.get(this.execution.currentNodeId);
      if (current) {
        lines.push(`  Current: ${current.role} (${current.id})`);
      }
    }

    lines.push(`  Status: ${this.execution.status}`);
    lines.push(`  Nodes: ${this.execution.nodes.length}, Edges: ${this.execution.edges.length}`);

    const completedCount = this.execution.nodes.filter(n => n.status === 'completed').length;
    const failedCount = this.execution.nodes.filter(n => n.status === 'failed').length;
    lines.push(`  Completed: ${completedCount}, Failed: ${failedCount}`);

    return lines.join('\n');
  }

  showStatus(): string {
    if (!this.execution) return 'No execution data';

    const lines: string[] = [
      `Execution: ${this.execution.id}`,
      `Task: ${this.execution.task.slice(0, 80)}`,
      `Status: ${this.execution.status}`,
      '',
      'Node Status:',
    ];

    for (const node of this.execution.nodes) {
      const result = this.execution.results.get(node.id);
      const duration = result ? `${result.durationMs}ms` : '-';
      const errCount = result ? result.errors.length : 0;
      const errInfo = errCount > 0 ? ` errors:${errCount}` : '';
      lines.push(`  ${node.role} (${node.id}): ${node.status} attempt:${node.attempt}/${node.maxRetries} ${duration}${errInfo}`);
    }

    const allResults = Array.from(this.execution.results.values());
    const totalDuration = allResults.reduce((sum, r) => sum + r.durationMs, 0);
    lines.push('');
    lines.push(`Total time: ${totalDuration}ms`);

    if (this.execution.error) {
      lines.push(`Error: ${this.execution.error}`);
    }

    return lines.join('\n');
  }

  showMermaid(): string {
    if (!this.execution) return '```mermaid\nflowchart TD\n```';

    const lines: string[] = [
      '```mermaid',
      'flowchart TD',
    ];

    for (const node of this.execution.nodes) {
      const nodeId = node.id.replace(/[^a-zA-Z0-9]/g, '_');
      const statusIcon = node.status === 'completed' ? '✅ ' : node.status === 'failed' ? '❌ ' : node.status === 'running' ? '🔄 ' : '';
      lines.push(`  ${nodeId}["${statusIcon}${node.role}"]`);
    }

    for (const edge of this.execution.edges) {
      const fromId = edge.from.replace(/[^a-zA-Z0-9]/g, '_');
      const toId = edge.to.replace(/[^a-zA-Z0-9]/g, '_');
      lines.push(`  ${fromId} --> ${toId}`);
    }

    lines.push('```');
    return lines.join('\n');
  }
}

export function createGraphVisualizer(execution?: DAGExecution): GraphVisualizer {
  const vis = new GraphVisualizer();
  if (execution) vis.setExecution(execution);
  return vis;
}
