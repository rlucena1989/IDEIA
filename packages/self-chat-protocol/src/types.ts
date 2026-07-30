export interface SelfChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  context?: SelfQueryContext;
}

export interface SelfQueryContext {
  topic: SelfQueryTopic;
  entities: string[];
  filters?: Record<string, string>;
}

export type SelfQueryTopic =
  | 'architecture'
  | 'capabilities'
  | 'packages'
  | 'contracts'
  | 'gaps'
  | 'adr'
  | 'radar'
  | 'slo'
  | 'schema'
  | 'feedback'
  | 'isolation'
  | 'health'
  | 'unknown';

export interface SelfChatResponse {
  message: SelfChatMessage;
  source?: string;
  confidence: number;
}

export interface SelfChatConfig {
  maxHistorySize: number;
  enableContextInjection: boolean;
  enableEventBus: boolean;
  autoScanEnabled: boolean;
}

export interface SelfChatStats {
  totalMessages: number;
  topicsCovered: SelfQueryTopic[];
  lastActivity: string;
  averageConfidence: number;
}
