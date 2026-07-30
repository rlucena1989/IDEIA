export interface StreamMetric { name: string; messages: number; bytes: number; consumers: number; discards: number; maxAge: number }
export interface ConsumerLag { consumerName: string; streamName: string; lag: number; lastAck: string; pending: number }
export interface DLQEntry { id: string; stream: string; subject: string; error: string; enqueuedAt: string; retries: number }
export interface LatencyPercentile { p50: number; p95: number; p99: number; p999: number }
export interface NATSHealth { connected: boolean; uptime: number; streams: number; consumers: number; avgLatency: number }
export interface ObservabilityReport { period: string; streams: StreamMetric[]; consumerLags: ConsumerLag[]; dlqCount: number; latency: LatencyPercentile; healthy: boolean }
