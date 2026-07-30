import { ChatMessage, Checkpoint as _Checkpoint, IdeaRequest as _IdeaRequest, ProjectResult as _ProjectResult, TaskSpec, AgentInfo, DashboardMetrics, SSEEvent } from './ideia-types';
import { createLogger } from '@ideia/logger';

export const IDEIA_CHAT_PATH = '/services/ideia-chat';
export const IDEIA_TASK_PATH = '/services/ideia-task';
export const IDEIA_AGENT_PATH = '/services/ideia-agent';
export const IDEIA_MEMORY_PATH = '/services/ideia-memory';
export const IDEIA_DASHBOARD_PATH = '/services/ideia-dashboard';
export const IDEIA_SUGGESTIONS_PATH = '/services/ideia-suggestions';
export const IDEIA_STUDIES_PATH = '/services/ideia-studies';
export const IDEIA_SEARCH_PATH = '/services/ideia-search';
export const IDEIA_SECURITY_PATH = '/services/ideia-security';
export const IDEIA_CONTROL_TOWER_PATH = '/services/ideia-control-tower';
export const IDEIA_BHP_PATH = '/services/ideia-bhp';
export const IDEIA_CONTINUITY_PATH = '/services/ideia-continuity';

export const IDEIA_CHAT_SERVICE = Symbol('IDEIA_ChatService');
export const IDEIA_TASK_SERVICE = Symbol('IDEIA_TaskService');
export const IDEIA_AGENT_SERVICE = Symbol('IDEIA_AgentService');
export const IDEIA_MEMORY_SERVICE = Symbol('IDEIA_MemoryService');
export const IDEIA_DASHBOARD_SERVICE = Symbol('IDEIA_DashboardService');
export const IDEIA_SUGGESTIONS_SERVICE = Symbol('IDEIA_SuggestionsService');
export const IDEIA_STUDIES_SERVICE = Symbol('IDEIA_StudiesService');
export const IDEIA_SEARCH_SERVICE = Symbol('IDEIA_SearchService');
export const IDEIA_SECURITY_SERVICE = Symbol('IDEIA_SecurityService');
export const IDEIA_CONTROL_TOWER_SERVICE = Symbol('IDEIA_ControlTowerService');
export const IDEIA_BHP_SERVICE = Symbol('IDEIA_BhpService');
export const IDEIA_CONTINUITY_SERVICE = Symbol('IDEIA_ContinuityService');

export interface IDEIA_ChatService {
  sendMessage(request: ChatRequest): Promise<void>;
  streamMessage(request: ChatRequest): AsyncIterable<SSEEvent>;
  getHistory(conversationId: string): Promise<ChatMessage[]>;
  createConversation(): Promise<string>;
  clearConversation(id: string): Promise<void>;
  approveCheckpoint(checkpointId: string): Promise<void>;
  rejectCheckpoint(checkpointId: string, reason?: string): Promise<void>;
}

export interface IDEIA_TaskService {
  getTasks(): Promise<TaskSpec[]>;
  getTask(id: string): Promise<TaskSpec | undefined>;
  cancelTask(id: string): Promise<void>;
  retryTask(id: string): Promise<void>;
  getTaskLogs(id: string): Promise<string[]>;
}

export interface IDEIA_AgentService {
  getAgents(): Promise<AgentInfo[]>;
  getAgent(id: string): Promise<AgentInfo | undefined>;
  runAgent(agentId: string, input: string): Promise<string>;
  stopAgent(agentId: string): Promise<void>;
  getAgentMetrics(id: string): Promise<AgentInfo['metrics'] | undefined>;
}

export interface IDEIA_MemoryService {
  store(key: string, value: unknown): Promise<void>;
  retrieve(key: string): Promise<unknown>;
  search(query: string, limit?: number): Promise<Array<{ key: string; value: unknown; score: number }>>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

export interface IDEIA_DashboardService {
  getMetrics(): Promise<DashboardMetrics>;
  getTimeline(hours?: number): Promise<Array<{ timestamp: string; event: string; detail: string }>>;
}

export interface IDEIA_SuggestionsService {
  getSuggestions(): Promise<SuggestionItem[]>;
  dismissSuggestion(id: string): Promise<void>;
  applySuggestion(id: string): Promise<void>;
}

export interface SuggestionItem {
  id: string;
  category: 'Security' | 'Performance' | 'Features' | 'Quality';
  priority: 'High' | 'Medium' | 'Low';
  title: string;
  effort: string;
}

export interface IDEIA_StudiesService {
  getStudies(): Promise<StudyItem[]>;
}

export interface StudyItem {
  id: string;
  name: string;
  status: 'active' | 'completed';
  description: string;
}

export interface IDEIA_SearchService {
  search(query: string): Promise<SearchResult[]>;
}

export type ComplianceFramework = 'lgpd' | 'hipaa' | 'gdpr' | 'soc2';
export type ComplianceStatus = 'pass' | 'fail' | 'na';
export type ComplianceSeverity = 'critical' | 'high' | 'medium' | 'low';

export interface ComplianceCheck {
  id: string;
  framework: ComplianceFramework;
  article: string;
  description: string;
  status: ComplianceStatus;
  severity: ComplianceSeverity;
  detail?: string;
  remediation?: string;
}

export interface ComplianceReport {
  framework: ComplianceFramework;
  timestamp: string;
  checks: ComplianceCheck[];
  score: number;
  summary: string;
}

export interface SecurityMetrics {
  complianceReports: ComplianceReport[];
  policyAuditStatus: { total: number; passed: number; failed: number };
  totalPolicies: number;
  lastAudit: string;
  overallScore: number;
}

export interface IDEIA_SecurityService {
  getSecurityMetrics(): Promise<SecurityMetrics>;
  runComplianceCheck(framework?: string): Promise<ComplianceReport[]>;
}

export interface SearchResult {
  id: string;
  label: string;
  description: string;
  icon: string;
}

export type LifecyclePhase = 'stopped' | 'starting' | 'running' | 'stopping' | 'error';

export interface LifecycleStatus {
  phase: LifecyclePhase;
  startedAt: string | null;
  uptimeMs: number;
  components: Record<string, 'ok' | 'error' | 'starting'>;
  lastError: string | null;
}

export interface IDEIA_LifecycleService {
  start(): Promise<void>;
  stop(): Promise<void>;
  restart(): Promise<void>;
  getStatus(): Promise<LifecycleStatus>;
}

export type SubsystemStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface SubsystemHealth {
  name: string;
  status: SubsystemStatus;
  lastCheck: string;
  detail?: string;
}

export interface HealthReport {
  overall: SubsystemStatus;
  subsystems: SubsystemHealth[];
  uptime: number;
  timestamp: string;
}

export interface SystemMetrics {
  eventBusSubscribers: number;
  activeConversations: number;
  activeStreams: number;
  memoryUsage: number;
  servicesRegistered: number;
  uptimeSeconds: number;
  lastEventTimestamp: string | null;
}

export interface IDEIA_HealthService {
  getHealth(): Promise<HealthReport>;
  getMetrics(): Promise<SystemMetrics>;
}

export interface IDEIA_ControlTowerService {
  getStatus(): Promise<TowerServiceStatus>;
  getTimeline(): Promise<TimelineServiceEntry[]>;
  emergencyStop(reason: string): Promise<void>;
  emergencyPause(reason: string): Promise<void>;
  emergencyRollback(id: string): Promise<void>;
  emergencyResume(): Promise<void>;
  setAutonomyLevel(level: string): Promise<void>;
}

export interface TowerServiceStatus {
  autonomyLevel: string;
  healthPercent: number;
  mode: string;
  activeTriggers: number;
  pendingDecisions: number;
  lastAction: string | null;
  lastActionTimestamp: string | null;
}

export interface TimelineServiceEntry {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  actor: string;
}

export interface IDEIA_BhpService {
  getStatus(): Promise<{ connected: boolean; messageCount: number }>;
  getHistory(): Promise<BhpMessageItem[]>;
  sendHelp(intent: string, target: string): Promise<string>;
}

export interface BhpMessageItem {
  id: string;
  type: string;
  source: string;
  target: string;
  timestamp: string;
  payload: Record<string, unknown>;
}

export interface IDEIA_ContinuityService {
  getStatus(): Promise<ContinuityServiceStatus>;
  registerDecision(description: string, priority: string, profileMatch: number): Promise<string>;
  resolveDecision(id: string, action: string): Promise<boolean>;
}

export interface ContinuityServiceStatus {
  pendingDecisions: number;
  resolvedDecisions: number;
  escalatedDecisions: number;
  autoDecided: number;
  timeoutCount: number;
  oldestPendingAge: number;
}

export interface ConfigEntry {
  key: string;
  value: unknown;
  type: 'string' | 'number' | 'boolean' | 'object';
  description?: string;
}

export const IDEIA_CONFIG_SERVICE = Symbol('IDEIA_ConfigService');

export interface IDEIA_ConfigService {
  getFullConfig(): Promise<Record<string, unknown>>;
  getConfig(path: string): Promise<ConfigEntry>;
  setConfig(path: string, value: unknown): Promise<void>;
  resetConfig(): Promise<void>;
}

export interface BridgeEvent {
  id: string;
  type: string;
  timestamp: string;
  source: string;
  payload?: Record<string, unknown>;
}

export interface BridgeSubscription {
  id: string;
  eventTypes: string[];
  createdAt: string;
}

export interface IDEIA_EventBridge {
  subscribe(eventTypes?: string[]): Promise<string>;
  unsubscribe(id: string): Promise<void>;
  getActiveSubscriptions(): Promise<BridgeSubscription[]>;
  getRecentEvents(count?: number): Promise<BridgeEvent[]>;
  streamEvents(eventTypes?: string[]): AsyncIterable<BridgeEvent>;
}

export interface ChatRequest {
  conversationId: string;
  message: string;
  context?: {
    workspaceRoot?: string;
    openFiles?: string[];
    selectedText?: string;
  };
}


export const IDEIA_PROJECT_PANEL_SERVICE = Symbol('IDEIA_ProjectPanelService');

export interface IDEIA_ProjectPanelService {
  getProjectData(): Promise<ProjectPanelData>;
  refreshProjectData(): Promise<void>;
}

export interface ProjectPanelData {
  projectName: string;
  projectPath: string;
  lastUpdated: string;
  metrics: Record<string, number>;
  status: string;
}

export interface ProjOptReport {
  projectId: string;
  optimizations: OptimizationSuggestion[];
  totalSavings: number;
  generatedAt: string;
}

export interface OptimizationSuggestion {
  id: string;
  category: string;
  description: string;
  impact: number;
  effort: 'low' | 'medium' | 'high';
}

export interface SelfOptMetrics {
  totalOptimizations: number;
  activeOptimizations: number;
  completedOptimizations: number;
  averageImprovement: number;
  timeline: SelfOptTimelinePoint[];
}

export interface SelfOptTimelinePoint {
  timestamp: string;
  metric: string;
  value: number;
}

export interface UxDashboard {
  userSatisfaction: number;
  taskCompletionRate: number;
  timeToValue: number;
  featureUsage: Record<string, number>;
  feedback: Array<{ rating: number; comment: string; timestamp: string }>;
}
