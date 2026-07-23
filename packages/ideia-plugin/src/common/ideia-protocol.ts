import { ChatMessage, Checkpoint as _Checkpoint, IdeaRequest as _IdeaRequest, ProjectResult as _ProjectResult, TaskSpec, AgentInfo, DashboardMetrics, SSEEvent } from './ideia-types';

export const IDEIA_CHAT_PATH = '/services/ideia-chat';
export const IDEIA_TASK_PATH = '/services/ideia-task';
export const IDEIA_AGENT_PATH = '/services/ideia-agent';
export const IDEIA_MEMORY_PATH = '/services/ideia-memory';
export const IDEIA_DASHBOARD_PATH = '/services/ideia-dashboard';
export const IDEIA_SUGGESTIONS_PATH = '/services/ideia-suggestions';
export const IDEIA_STUDIES_PATH = '/services/ideia-studies';
export const IDEIA_SEARCH_PATH = '/services/ideia-search';
export const IDEIA_SECURITY_PATH = '/services/ideia-security';

export const IDEIA_CHAT_SERVICE = Symbol('IDEIA_ChatService');
export const IDEIA_TASK_SERVICE = Symbol('IDEIA_TaskService');
export const IDEIA_AGENT_SERVICE = Symbol('IDEIA_AgentService');
export const IDEIA_MEMORY_SERVICE = Symbol('IDEIA_MemoryService');
export const IDEIA_DASHBOARD_SERVICE = Symbol('IDEIA_DashboardService');
export const IDEIA_SUGGESTIONS_SERVICE = Symbol('IDEIA_SuggestionsService');
export const IDEIA_STUDIES_SERVICE = Symbol('IDEIA_StudiesService');
export const IDEIA_SEARCH_SERVICE = Symbol('IDEIA_SearchService');
export const IDEIA_SECURITY_SERVICE = Symbol('IDEIA_SecurityService');

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

export interface ChatRequest {
  conversationId: string;
  message: string;
  context?: {
    workspaceRoot?: string;
    openFiles?: string[];
    selectedText?: string;
  };
}
