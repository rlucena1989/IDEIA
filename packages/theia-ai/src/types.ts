import { Disposable, Event } from '@ideia/core-contributions';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export interface AiMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCalls?: AiToolCall[];
  toolCallId?: string;
  name?: string;
}

export interface AiToolCall {
  id: string;
  type: 'function';
  function: { name: string; arguments: string };
}

export interface AiRequest {
  messages: AiMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  tools?: AiTool[];
  signal?: AbortSignal;
}

export interface AiResponse {
  content: string;
  toolCalls?: AiToolCall[];
  usage?: { inputTokens: number; outputTokens: number; totalTokens: number };
  finishReason: string;
  latencyMs: number;
  cached: boolean;
}

export interface AiStreamChunk {
  content: string;
  toolCall?: AiToolCall;
  finishReason?: string;
  done?: boolean;
  cancelled?: boolean;
}

export interface ChatStreamOptions {
  signal?: AbortSignal;
  onChunk?: (chunk: AiStreamChunk) => void;
  onComplete?: (fullContent: string) => void;
  onError?: (error: Error) => void;
}

export interface AiTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface AiProvider {
  readonly id: string;
  readonly name: string;
  chat(request: AiRequest): Promise<AiResponse>;
  streamChat(request: AiRequest): AsyncIterable<AiStreamChunk>;
  isAvailable(): Promise<boolean>;
}

export interface AiManager {
  registerProvider(provider: AiProvider): Disposable;
  unregisterProvider(id: string): void;
  getProvider(id: string): AiProvider | undefined;
  getProviders(): AiProvider[];
  setDefaultProvider(id: string): void;
  getDefaultProvider(): AiProvider | undefined;
  chat(request: AiRequest): Promise<AiResponse>;
  streamChat(request: AiRequest): AsyncIterable<AiStreamChunk>;
  onProviderRegistered: Event<AiProvider>;
  onProviderUnregistered: Event<string>;
}

export interface AiAgent {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly capabilities: string[];
  readonly autonomyLevel: number;
  execute(request: AiRequest): Promise<AiResponse>;
  getTools(): AiTool[];
}

export interface AiChatParticipant {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  handleMessage(message: AiMessage, context?: AiChatContext): Promise<AiResponse>;
}

export interface AiChatContext {
  editorUri?: string;
  selection?: string;
  workspaceRoots?: string[];
  activeDiagnostics?: unknown[];
}

export interface AiContextProvider {
  readonly id: string;
  provideContext(request: AiRequest): Promise<AiContext>;
}

export interface AiContext {
  type: string;
  content: string;
  priority: number;
  metadata?: Record<string, unknown>;
}

export interface AiPermissionManager {
  checkPermission(agentId: string, action: string, resource: string): Promise<boolean>;
  requestApproval(agentId: string, action: string, resource: string, reason: string): Promise<boolean>;
}

export interface AiAuditEntry {
  id: string;
  timestamp: Date;
  agentId: string;
  action: string;
  resource: string;
  status: 'allowed' | 'denied' | 'approved' | 'rejected';
  reason?: string;
  hash: string;
}
