export interface SloMetric {
  contract: string
  timestamp: number
  latencyP50: number
  latencyP95: number
  latencyP99: number
  availability: number
  throughput: number
  errorRate: number
  name?: string
  success?: boolean
}

export interface SloThreshold {
  latencyP50Max: number
  latencyP95Max: number
  latencyP99Max: number
  availabilityMin: number
  throughputMin: number
  errorRateMax: number
}

export interface SloTarget {
  contract: string
  description: string
  threshold: SloThreshold
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export type SloStatus = 'healthy' | 'warning' | 'violated' | 'degraded' | 'unknown'

export interface SloResult {
  contract: string
  status: SloStatus
  metrics: SloMetric
  violations: string[]
  lastChecked: number
}

export interface SloViolation {
  contract: string
  metric: string
  expected: number
  actual: number
  severity: string
  timestamp: number
  message: string
}

export interface SloDashboard {
  totalContracts: number
  healthy: number
  warning: number
  violated: number
  degraded: number
  unknown: number
  overallAvailability: number
  recentViolations: SloViolation[]
  contracts: SloResult[]
  generatedAt: number
}

export interface ContractBreakage {
  contract: string
  brokenSince: number
  lastStableVersion: string
  rollingBack: boolean
  recovered: boolean
}

export const SLO_TARGETS: Record<string, SloTarget> = {
  C1: {
    contract: 'C1', description: 'Command Dispatch Latency',
    threshold: { latencyP50Max: 100, latencyP95Max: 250, latencyP99Max: 500, availabilityMin: 99.9, throughputMin: 1000, errorRateMax: 0.01 },
    severity: 'critical'
  },
  C2: {
    contract: 'C2', description: 'Event Bus Delivery',
    threshold: { latencyP50Max: 50, latencyP95Max: 150, latencyP99Max: 300, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical'
  },
  C3: {
    contract: 'C3', description: 'Agent Response Time',
    threshold: { latencyP50Max: 500, latencyP95Max: 2000, latencyP99Max: 5000, availabilityMin: 99.5, throughputMin: 100, errorRateMax: 0.05 },
    severity: 'high'
  },
  C4: {
    contract: 'C4', description: 'Memory Store Read',
    threshold: { latencyP50Max: 10, latencyP95Max: 30, latencyP99Max: 100, availabilityMin: 99.99, throughputMin: 10000, errorRateMax: 0.001 },
    severity: 'critical'
  },
  C5: {
    contract: 'C5', description: 'Memory Store Write',
    threshold: { latencyP50Max: 20, latencyP95Max: 60, latencyP99Max: 200, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical'
  },
  C6: {
    contract: 'C6', description: 'Tool Execution',
    threshold: { latencyP50Max: 200, latencyP95Max: 500, latencyP99Max: 1000, availabilityMin: 99.9, throughputMin: 500, errorRateMax: 0.01 },
    severity: 'high'
  },
  C7: {
    contract: 'C7', description: 'AI Inference',
    threshold: { latencyP50Max: 1000, latencyP95Max: 3000, latencyP99Max: 8000, availabilityMin: 99.5, throughputMin: 50, errorRateMax: 0.02 },
    severity: 'high'
  },
  C8: {
    contract: 'C8', description: 'Authentication',
    threshold: { latencyP50Max: 150, latencyP95Max: 400, latencyP99Max: 800, availabilityMin: 99.95, throughputMin: 2000, errorRateMax: 0.005 },
    severity: 'critical'
  },
  C9: {
    contract: 'C9', description: 'Policy Evaluation',
    threshold: { latencyP50Max: 30, latencyP95Max: 80, latencyP99Max: 200, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical'
  },
  C10: {
    contract: 'C10', description: 'File System Operations',
    threshold: { latencyP50Max: 50, latencyP95Max: 150, latencyP99Max: 500, availabilityMin: 99.9, throughputMin: 1000, errorRateMax: 0.01 },
    severity: 'high'
  },
  C11: {
    contract: 'C11', description: 'Search Index',
    threshold: { latencyP50Max: 100, latencyP95Max: 300, latencyP99Max: 800, availabilityMin: 99.8, throughputMin: 500, errorRateMax: 0.02 },
    severity: 'medium'
  },
  C12: {
    contract: 'C12', description: 'Notification Delivery',
    threshold: { latencyP50Max: 200, latencyP95Max: 500, latencyP99Max: 1000, availabilityMin: 99.9, throughputMin: 1000, errorRateMax: 0.01 },
    severity: 'medium'
  },
  C13: {
    contract: 'C13', description: 'Plugin Lifecycle',
    threshold: { latencyP50Max: 300, latencyP95Max: 800, latencyP99Max: 2000, availabilityMin: 99.8, throughputMin: 100, errorRateMax: 0.02 },
    severity: 'medium'
  },
  C14: {
    contract: 'C14', description: 'WebSocket Connection',
    threshold: { latencyP50Max: 100, latencyP95Max: 300, latencyP99Max: 600, availabilityMin: 99.95, throughputMin: 2000, errorRateMax: 0.005 },
    severity: 'high'
  },
  C15: {
    contract: 'C15', description: 'API Gateway',
    threshold: { latencyP50Max: 80, latencyP95Max: 200, latencyP99Max: 500, availabilityMin: 99.99, throughputMin: 10000, errorRateMax: 0.001 },
    severity: 'critical'
  },
  C16: {
    contract: 'C16', description: 'Config Resolution',
    threshold: { latencyP50Max: 20, latencyP95Max: 50, latencyP99Max: 150, availabilityMin: 99.95, throughputMin: 5000, errorRateMax: 0.005 },
    severity: 'high'
  },
  C17: {
    contract: 'C17', description: 'Audit Trail Write',
    threshold: { latencyP50Max: 30, latencyP95Max: 80, latencyP99Max: 200, availabilityMin: 99.99, throughputMin: 5000, errorRateMax: 0.001 },
    severity: 'critical'
  },
  C18: {
    contract: 'C18', description: 'Dashboard Rendering',
    threshold: { latencyP50Max: 200, latencyP95Max: 500, latencyP99Max: 1000, availabilityMin: 99.8, throughputMin: 200, errorRateMax: 0.02 },
    severity: 'low'
  }
}
