export type ApprovalDecision = 'approved' | 'rejected' | 'modified' | 'auto-approved' | 'fallback' | 'escalated'

export type Channel = 'theia_widget' | 'theia_toast' | 'theia_tray' | 'slack' | 'email' | 'sms' | 'webhook' | 'pager'

export interface Step {
  id: string
  description: string
  type: 'create' | 'modify' | 'delete' | 'execute' | 'deploy' | 'rollback' | 'read' | 'search'
  action: string
  target: string
  parameters: Record<string, unknown>
  impact: 'low' | 'medium' | 'high' | 'critical'
  estimatedRisk: number
  requiresApproval: boolean
  rollbackPlan?: string
}

export interface Context {
  confidence: number
  risk: number
  urgency: number
  actionType: string
  domain: string
  environment: 'dev' | 'staging' | 'prod'
  fallbackPlan?: Step[]
  agentId: string
  sessionId: string
  traceId: string
  autonomyLevel: 'blocked' | 'guided' | 'autonomous'
  metadata: Record<string, unknown>
}

export interface ApprovalResult {
  decision: ApprovalDecision
  approvedBy?: string
  timestamp: number
  reason?: string
  modifications?: Partial<Step>
  notificationHistory: NotificationRecord[]
  auditHash?: string
}

export interface ApprovalRequest {
  id: string
  step: Step
  context: Context
  status: 'pending' | 'approved' | 'rejected' | 'escalated' | 'timed_out' | 'cancelled'
  level: 1 | 2 | 3
  createdAt: number
  respondedAt?: number
  assignedTo?: string
  escalationPath: EscalationStep[]
  traceId: string
  sessionId: string
}

export interface EscalationStep {
  level: number
  channels: Channel[]
  timeout: number
  result: 'timeout' | 'responded' | 'escalated'
  respondedAt?: number
  respondedBy?: string
  response?: ApprovalDecision
}

export interface NotificationRecord {
  channel: Channel
  timestamp: number
  success: boolean
  responseTime: number
  error?: string
}

export interface NotificationMessage {
  channel: Channel
  requestId: string
  title: string
  body: string
  actions: string[]
  priority: 'low' | 'normal' | 'high' | 'critical'
  metadata: Record<string, unknown>
  timeout?: number
  expiresAt?: number
}

export interface NotificationChannel {
  name: Channel
  priority: number
  send(message: NotificationMessage): Promise<boolean>
  isAvailable(): Promise<boolean>
}

export interface HITLConfig {
  autoApproveThreshold: number
  maxRiskForAutoApprove: number
  escalationTimeouts: number[]
  escalationChannels: Channel[][]
  maxEscalationLevels: number
  defaultFallback: 'reject' | 'rollback' | 'continue'
  requireTwoFactor: boolean
  auditLogEnabled: boolean
  adaptiveEnabled: boolean
  circuitBreakerEnabled: boolean
  maxPendingRequests: number
  requestExpiryMs: number
  backupHumanIds: string[]
}

export interface HITLNATSEvent {
  type:
    | 'hitl.request.created'
    | 'hitl.request.responded'
    | 'hitl.request.escalated'
    | 'hitl.request.timed_out'
    | 'hitl.request.cancelled'
    | 'hitl.circuit_breaker.engaged'
    | 'hitl.circuit_breaker.disengaged'
    | 'hitl.emergency_stop'
    | 'hitl.notification.sent'
    | 'hitl.notification.failed'
  requestId: string
  timestamp: number
  actor?: string
  payload: Record<string, unknown>
}

export interface AutonomyBridgeConfig {
  autonomyLevel: 'blocked' | 'guided' | 'autonomous'
  riskThreshold: number
  confidenceThreshold: number
  requireValidationForPhases: string[]
  autoRetryOnFailure: boolean
}

export interface PendingAction {
  requestId: string
  step: Step
  context: Context
  level: 1 | 2 | 3
  status: 'pending' | 'approved' | 'rejected' | 'timed_out'
  createdAt: number
  expiresAt: number
  notificationsSent: number
  lastNotificationAt: number
  assignedHumanId?: string
  decisionDeadline: number
}

export interface CircuitBreakerState {
  engaged: boolean
  engagedAt?: number
  engagedBy?: string
  reason?: string
  disengagedAt?: number
  emergencyStopActive: boolean
  pendingRequestCount: number
  maxPendingThreshold: number
  rateLimitWindow: number
  rateLimitMax: number
  rateCount: number
}

export interface HITLAuditEntry {
  id: string
  type: 'approval' | 'escalation' | 'override' | 'circuit_breaker' | 'emergency_stop'
  requestId: string
  stepId: string
  action: string
  decision: ApprovalDecision
  approvedBy: string | null
  level: number
  risk: number
  confidence: number
  environment: string
  agentId: string
  sessionId: string
  traceId: string
  timestamp: number
  responseTime: number
  channel: string
  hash: string
  previousHash: string
  metadata: Record<string, unknown>
}

export interface HITLStats {
  pendingCount: number
  autoApprovalRate: number
  circuitBreakerEngaged: boolean
  averageResponseTime: number
  totalDecisions: number
}

export interface ApprovalLogEntry {
  id: string
  requestId: string
  stepId: string
  stepDescription: string
  action: string
  decision: ApprovalDecision
  approvedBy: string | null
  level: number
  risk: number
  confidence: number
  environment: string
  agentId: string
  sessionId: string
  traceId: string
  timestamp: number
  responseTime: number
  channel: string
  hash: string
  previousHash: string
  metadata: Record<string, unknown>
}

export interface HitlResponseCallback {
  (response: { requestId: string; decision: string; approvedBy?: string }): void
}
