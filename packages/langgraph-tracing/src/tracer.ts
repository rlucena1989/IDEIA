import { createLogger } from '@ideia/logger'
import { GraphNode, GraphEdge, TraceSpan, GraphExecution, GraphMetrics, TracingReport } from './types'

const logger = createLogger('langgraph-tracer')

export class LangGraphTracer {
  private executions = new Map<string, GraphExecution>()
  private spans: TraceSpan[] = []

  startExecution(graphName: string, nodes: GraphNode[], edges: GraphEdge[]): string {
    const id = `exec-${Date.now()}`
    this.executions.set(id, { id, graphName, nodes, edges, spans: [], startTime: new Date().toISOString(), endTime: '', totalDurationMs: 0, success: false })
    logger.info(`Execution started`, { id, graphName })
    return id
  }

  addSpan(span: TraceSpan): void {
    this.spans.push(span)
    const exec = this.findExecution(span.traceId)
    if (exec) exec.spans.push(span)
  }

  endExecution(executionId: string, success: boolean): void {
    const exec = this.executions.get(executionId)
    if (!exec) return
    exec.endTime = new Date().toISOString()
    exec.totalDurationMs = this.spans.filter(s => s.traceId === executionId).reduce((sum, s) => sum + s.durationMs, 0)
    exec.success = success
    logger.info(`Execution ended`, { executionId, duration: exec.totalDurationMs, success })
  }

  getMetrics(executionId: string): GraphMetrics {
    const exec = this.executions.get(executionId)
    if (!exec) return { nodeCount: 0, edgeCount: 0, avgNodeDuration: 0, totalDuration: 0, errorRate: 0, throughput: 0 }
    const nodeDurations = exec.spans.map(s => s.durationMs)
    const errorCount = exec.spans.filter(s => s.status === 'error').length
    return {
      nodeCount: exec.nodes.length,
      edgeCount: exec.edges.length,
      avgNodeDuration: nodeDurations.length > 0 ? Math.round(nodeDurations.reduce((a, b) => a + b, 0) / nodeDurations.length) : 0,
      totalDuration: exec.totalDurationMs,
      errorRate: exec.spans.length > 0 ? Math.round((errorCount / exec.spans.length) * 100) : 0,
      throughput: exec.totalDurationMs > 0 ? Math.round(exec.spans.length / (exec.totalDurationMs / 1000)) : 0,
    }
  }

  generateReport(period: string): TracingReport {
    const allExecs = [...this.executions.values()]
    const avgDuration = allExecs.length > 0 ? Math.round(allExecs.reduce((s, e) => s + e.totalDurationMs, 0) / allExecs.length) : 0
    const errorCount = allExecs.filter(e => !e.success).length

    const nodeDurationMap = new Map<string, number[]>()
    for (const exec of allExecs) {
      for (const span of exec.spans) {
        const node = exec.nodes.find(n => n.id === span.nodeId)
        if (node) {
          if (!nodeDurationMap.has(node.name)) nodeDurationMap.set(node.name, [])
          nodeDurationMap.get(node.name)!.push(span.durationMs)
        }
      }
    }

    const slowestNodes = [...nodeDurationMap.entries()]
      .map(([name, durations]) => ({ name, avgDuration: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) }))
      .sort((a, b) => b.avgDuration - a.avgDuration)
      .slice(0, 5)

    return { period, executions: allExecs.length, avgDuration, errorRate: allExecs.length > 0 ? Math.round((errorCount / allExecs.length) * 100) : 0, slowestNodes }
  }

  private findExecution(traceId: string): GraphExecution | undefined {
    return [...this.executions.values()].find(e => e.spans.some(s => s.traceId === traceId) || e.id === traceId)
  }
}
