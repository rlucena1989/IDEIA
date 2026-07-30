export type GateType = 'pre-flight' | 'post-hoc' | 'conditional' | 'batch'
export type GateAction = 'approve' | 'reject' | 'modify' | 'timeout'
export type Urgency = 'low' | 'medium' | 'high' | 'critical'
export type EscalationLevel = 'dev' | 'tech-lead' | 'security' | 'manager'

export interface HITLGate {
  id: string
  type: GateType
  agentId: string
  action: string
  context: string
  riskLevel: string
  urgency: Urgency
  createdAt: string
  status: 'pending' | 'resolved' | 'timeout' | 'escalated'
  resolvedBy?: string
  resolution?: GateAction
  timeoutMs: number
}

export interface EscalationPolicy {
  id: string
  name: string
  conditions: EscalationCondition[]
  steps: EscalationStep[]
}

export interface EscalationCondition {
  metric: string
  operator: '>' | '<' | '==' | '>='
  value: number
}

export interface EscalationStep {
  level: EscalationLevel
  notifyAfterMs: number
  action: 'notify' | 'approve' | 'block'
}

export interface ApprovalResult {
  gateId: string
  approved: boolean
  action: GateAction
  reviewer: string
  timestamp: string
  comments?: string
}

export interface HITLConfig {
  defaultTimeoutMs: number
  maxEscalationLevel: EscalationLevel
  notificationChannels: string[]
  autoApprovePatterns?: string[]
}
