export type Decision = 'auto' | 'ask' | 'block';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type EventResult = 'success' | 'failure' | 'pending';
export type Actor = 'user' | 'system' | 'ai';
export type RiskLevel = 'low' | 'medium' | 'high';
export type ActionType = 'file.read' | 'file.write' | 'file.delete' | 'file.create' | 'file.create.dir' | 'file.rename' | 'shell.exec' | 'chat.message' | 'chat.memory.save' | 'sandbox.exec' | 'policy.change';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

// ---- Approval Types ----

export interface ApprovalRequest {
  approvalId: string;
  action: string;
  requestedBy: string;
  requestedAt: string;
  reason: string;
  status: ApprovalStatus;
}

export interface ApprovalResult {
  approved: boolean;
  approvedBy?: string;
  decidedAt: string;
  note: string;
}

// ---- WebSocket Event Types (unified event registry) ----

export type WsClientEvent = 'ping' | 'subscribe' | 'unsubscribe';
export type WsServerEvent = 'connected' | 'subscribed' | 'unsubscribed' | 'pong' | 'error';
export type WsBroadcastEvent = 'file:change' | 'terminal:execution' | 'memory:update' | 'session:created';
export type WsEventType = WsClientEvent | WsServerEvent | WsBroadcastEvent;

// ---- API Envelope ----

export interface ApiResponse<T = unknown> {
  ok: boolean;
  error?: string;
  data?: T;
}

// ---- Memory Types (unified entre package e CLI) ----

export type MemoryCategory = 'cycle' | 'failure' | 'recovery' | 'approval' | 'change' | 'trend' | 'policy' | 'agent' | 'decision' | 'pattern';

export interface MemoryRecord {
  memoryId: string;
  category: MemoryCategory;
  source: string;
  summary: string;
  tags: string[];
  createdAt: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  decision?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface MemoryPattern {
  patternId: string;
  name: string;
  frequency: number;
  confidence: number;
  description: string;
  detectedAt: string;
}

export interface LearningRecommendation {
  recommendationId: string;
  target: string;
  action: string;
  rationale: string;
  confidence: number;
}

export interface MemoryState {
  sessionId: string;
  workspaceRoot: string;
  activeTask: string | null;
  preferences: Record<string, unknown>;
  lastDecisions: Array<Record<string, unknown>>;
  context: Record<string, unknown>;
  records: MemoryRecord[];
}
