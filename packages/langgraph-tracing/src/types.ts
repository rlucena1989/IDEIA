export interface GraphNode { id: string; name: string; type: 'agent' | 'tool' | 'condition' | 'parallel'; parentId: string | null }
export interface GraphEdge { from: string; to: string; label: string; condition?: string }
export interface TraceSpan { id: string; nodeId: string; traceId: string; startTime: string; endTime: string; status: 'ok' | 'error'; durationMs: number; input?: string; output?: string }
export interface GraphExecution { id: string; graphName: string; nodes: GraphNode[]; edges: GraphEdge[]; spans: TraceSpan[]; startTime: string; endTime: string; totalDurationMs: number; success: boolean }
export interface GraphMetrics { nodeCount: number; edgeCount: number; avgNodeDuration: number; totalDuration: number; errorRate: number; throughput: number }
export interface TracingReport { period: string; executions: number; avgDuration: number; errorRate: number; slowestNodes: Array<{ name: string; avgDuration: number }> }
