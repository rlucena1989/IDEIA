export interface NatsMetrics {
  streams: {
    count: number;
    totalMessages: number;
    totalBytes: number;
    streamsWithDiscards: number;
    averageMessagesPerStream: number;
  };
  consumers: {
    count: number;
    withLag: number;
    totalPending: number;
    avgAckPending: number;
    redeliveryRate: number;
  };
  dlq: {
    size: number;
    oldestMessageAge: number;
    growthRate: number;
    dlqRate: number;
  };
  latency: {
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    p999: number;
  };
  throughput: {
    messagesPerSecond: number;
    bytesPerSecond: number;
  };
  health: {
    healthy: boolean;
    connected: boolean;
    reconnects: number;
    lastError: string | null;
    uptime: number;
  };
}

export interface SLODefinition {
  name: string;
  target: number;
  severity: 'warning' | 'critical';
  window: number;
  burnRate: number;
}

export interface SLOStatus {
  name: string;
  target: number;
  actual: number;
  compliant: boolean;
  burnRate: number;
}

export interface AlertRule {
  metric: string;
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
  threshold: number;
  severity: 'warning' | 'critical' | 'info';
  cooldown: number;
}

export interface Alert {
  id: string;
  rule: string;
  message: string;
  severity: 'warning' | 'critical' | 'info';
  timestamp: number;
  acknowledged: boolean;
  resolved: boolean;
}

export interface DashboardConfig {
  refreshInterval: number;
  timeWindow: string;
  metrics: string[];
  panels: string[];
}

export interface MetricSnapshot {
  timestamp: number;
  metrics: NatsMetrics;
  slos: SLOStatus[];
}

export type MetricOperator = 'gt' | 'lt' | 'gte' | 'lte' | 'eq';
