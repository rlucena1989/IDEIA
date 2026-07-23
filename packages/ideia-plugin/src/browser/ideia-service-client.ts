import { injectable } from '@theia/core/shared/inversify';
import {
  IDEIA_ChatService, IDEIA_TaskService, IDEIA_AgentService,
  IDEIA_MemoryService, IDEIA_DashboardService, ChatRequest,
  IDEIA_SuggestionsService, SuggestionItem,
  IDEIA_StudiesService, StudyItem,
  IDEIA_SearchService, SearchResult,
  IDEIA_SecurityService, SecurityMetrics, ComplianceReport,
} from '../common/ideia-protocol';
import { ChatMessage, Checkpoint, TaskSpec, AgentInfo, DashboardMetrics, SSEEvent, ProjectResult } from '../common/ideia-types';

const RPC_TIMEOUT_MS = 30000;

class PersistentJsonRpcClient {
  private ws: WebSocket | null = null;
  private requestId = 0;
  private pending = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timeout: ReturnType<typeof setTimeout> }>();
  private messageQueue: Array<{ id: string; message: object }> = [];
  private connecting = false;
  private reconnectAttempts = 0;
  private closed = false;
  private basePath: string;

  constructor(path: string) {
    this.basePath = path;
  }

  async call<T>(method: string, params: unknown[]): Promise<T> {
    const id = String(++this.requestId);
    const message = { jsonrpc: '2.0', id, method, params };

    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.sendMessage<T>(id, message);
    }
    return this.queueOrConnect<T>(id, message);
  }

  private sendMessage<T>(id: string, message: object): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: no response within ${RPC_TIMEOUT_MS}ms`));
      }, RPC_TIMEOUT_MS);
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });
      if (!this.ws) throw new Error('WebSocket not connected');
      this.ws.send(JSON.stringify(message));
    });
  }

  private queueOrConnect<T>(id: string, message: object): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`RPC timeout: no response within ${RPC_TIMEOUT_MS}ms`));
      }, RPC_TIMEOUT_MS);
      this.messageQueue.push({ id, message });
      this.pending.set(id, { resolve: resolve as (v: unknown) => void, reject, timeout });
      if (!this.connecting && !this.closed) this.connect();
    });
  }

  private rejectAllPending(reason: string): void {
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timeout);
      entry.reject(new Error(reason));
      this.pending.delete(id);
    }
  }

  private async connect(): Promise<void> {
    if (this.connecting || this.closed) return;
    this.connecting = true;

    try {
      await new Promise<void>((resolve, reject) => {
        const ws = new WebSocket(`ws://${location.host}${this.basePath}`);
        ws.onopen = () => {
          this.ws = ws;
          this.connecting = false;
          this.reconnectAttempts = 0;
          this.flushQueue();
          resolve();
        };
        ws.onmessage = event => {
          const response = JSON.parse(event.data);
          const entry = this.pending.get(response.id);
          if (entry) {
            clearTimeout(entry.timeout);
            this.pending.delete(response.id);
            if (response.error) entry.reject(new Error(response.error.message));
            else entry.resolve(response.result);
          }
        };
        ws.onerror = () => {
          this.connecting = false;
          reject(new Error(`Connection failed to ${this.basePath}`));
        };
        ws.onclose = () => {
          this.ws = null;
          this.connecting = false;
          this.rejectAllPending('WebSocket disconnected');
          this.scheduleReconnect();
        };
      });
    } catch (_err) {
      this.connecting = false;
      for (const item of this.messageQueue) {
        const entry = this.pending.get(item.id);
        if (entry) {
          clearTimeout(entry.timeout);
          this.pending.delete(item.id);
          entry.reject(err instanceof Error ? err : new Error('Connection failed'));
        }
      }
      this.messageQueue = [];
      this.scheduleReconnect();
    }
  }

  private flushQueue(): void {
    for (const item of this.messageQueue) {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify(item.message));
      }
    }
    this.messageQueue = [];
  }

  private scheduleReconnect(): void {
    if (this.closed) return;
    const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    setTimeout(() => this.connect(), delay);
  }

  close(): void {
    this.closed = true;
    if (this.ws) { this.ws.close(); this.ws = null; }
    this.rejectAllPending('Connection closed');
    this.messageQueue = [];
  }
}

function createJsonRpcClient<T extends object>(path: string): T {
  const client = new PersistentJsonRpcClient(path);
  return new Proxy({} as T, {
    get(_, method: string | symbol) {
      return (...args: unknown[]) => client.call<T[keyof T]>(String(method), args);
    },
  }) as T;
}

@injectable()
export class IDEIA_ChatClient implements IDEIA_ChatService {
  private ws: WebSocket | null = null;
  private basePath = '/services/ideia-chat';

  async sendMessage(request: ChatRequest): Promise<void> {
    const response = await fetch(`${this.basePath}/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
    });
    if (!response.ok) throw new Error(`Chat error: ${response.statusText}`);
  }

  async *streamMessage(request: ChatRequest): AsyncIterable<SSEEvent> {
    const abortController = new AbortController();
    const timeout = setTimeout(() => abortController.abort(), 120000);
    let lastHeartbeat = Date.now();
    const heartbeatCheck = setInterval(() => {
      if (Date.now() - lastHeartbeat > 30000) {
        abortController.abort();
      }
    }, 15000);

    try {
      const response = await fetch(`${this.basePath}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: abortController.signal,
      });

      if (!response.ok) throw new Error(`Stream error: ${response.statusText}`);

      if (!response.body) throw new Error('Response body is null');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim();
            if (data === '[DONE]') return;
            try {
              const event: SSEEvent = JSON.parse(data);
              if (event.type === 'heartbeat') {
                lastHeartbeat = Date.now();
                continue;
              }
              yield event;
            } catch { /* skip malformed SSE */ }
          }
        }
      }
    } finally {
      clearTimeout(timeout);
      clearInterval(heartbeatCheck);
    }
  }

  async getHistory(conversationId: string): Promise<ChatMessage[]> {
    const res = await fetch(`${this.basePath}/history/${conversationId}`);
    return res.json();
  }

  async createConversation(): Promise<string> {
    const res = await fetch(`${this.basePath}/conversation`, { method: 'POST' });
    const data = await res.json();
    return data.conversationId;
  }

  async clearConversation(id: string): Promise<void> {
    await fetch(`${this.basePath}/conversation/${id}`, { method: 'DELETE' });
  }

  async approveCheckpoint(checkpointId: string): Promise<void> {
    const res = await fetch(`${this.basePath}/checkpoint/${checkpointId}/approve`, { method: 'POST' });
    if (!res.ok) throw new Error(`Failed to approve checkpoint: ${res.statusText}`);
  }

  async rejectCheckpoint(checkpointId: string, reason?: string): Promise<void> {
    const res = await fetch(`${this.basePath}/checkpoint/${checkpointId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });
    if (!res.ok) throw new Error(`Failed to reject checkpoint: ${res.statusText}`);
  }
}

@injectable()
export class IDEIA_TaskClient implements IDEIA_TaskService {
  private rpc = createJsonRpcClient<IDEIA_TaskService>('/services/ideia-task');

  async getTasks(): Promise<TaskSpec[]> { return this.rpc.getTasks(); }
  async getTask(id: string): Promise<TaskSpec | undefined> { return this.rpc.getTask(id); }
  async cancelTask(id: string): Promise<void> { return this.rpc.cancelTask(id); }
  async retryTask(id: string): Promise<void> { return this.rpc.retryTask(id); }
  async getTaskLogs(id: string): Promise<string[]> { return this.rpc.getTaskLogs(id); }
}

@injectable()
export class IDEIA_AgentClient implements IDEIA_AgentService {
  private rpc = createJsonRpcClient<IDEIA_AgentService>('/services/ideia-agent');

  async getAgents(): Promise<AgentInfo[]> { return this.rpc.getAgents(); }
  async getAgent(id: string): Promise<AgentInfo | undefined> { return this.rpc.getAgent(id); }
  async runAgent(agentId: string, input: string): Promise<string> { return this.rpc.runAgent(agentId, input); }
  async stopAgent(agentId: string): Promise<void> { return this.rpc.stopAgent(agentId); }
  async getAgentMetrics(id: string): Promise<AgentInfo['metrics'] | undefined> { return this.rpc.getAgentMetrics(id); }
}

@injectable()
export class IDEIA_MemoryClient implements IDEIA_MemoryService {
  private rpc = createJsonRpcClient<IDEIA_MemoryService>('/services/ideia-memory');

  async store(key: string, value: unknown): Promise<void> { return this.rpc.store(key, value); }
  async retrieve(key: string): Promise<unknown> { return this.rpc.retrieve(key); }
  async search(query: string, limit?: number): Promise<Array<{ key: string; value: unknown; score: number }>> {
    return this.rpc.search(query, limit);
  }
  async delete(key: string): Promise<void> { return this.rpc.delete(key); }
  async list(prefix?: string): Promise<string[]> { return this.rpc.list(prefix); }
}

@injectable()
export class IDEIA_DashboardClient implements IDEIA_DashboardService {
  private rpc = createJsonRpcClient<IDEIA_DashboardService>('/services/ideia-dashboard');

  async getMetrics(): Promise<DashboardMetrics> { return this.rpc.getMetrics(); }
  async getTimeline(hours?: number): Promise<Array<{ timestamp: string; event: string; detail: string }>> {
    return this.rpc.getTimeline(hours);
  }
}

@injectable()
export class IDEIA_SuggestionsClient implements IDEIA_SuggestionsService {
  private rpc = createJsonRpcClient<IDEIA_SuggestionsService>('/services/ideia-suggestions');

  async getSuggestions(): Promise<SuggestionItem[]> { return this.rpc.getSuggestions(); }
  async dismissSuggestion(id: string): Promise<void> { return this.rpc.dismissSuggestion(id); }
  async applySuggestion(id: string): Promise<void> { return this.rpc.applySuggestion(id); }
}

@injectable()
export class IDEIA_StudiesClient implements IDEIA_StudiesService {
  private rpc = createJsonRpcClient<IDEIA_StudiesService>('/services/ideia-studies');

  async getStudies(): Promise<StudyItem[]> { return this.rpc.getStudies(); }
}

@injectable()
export class IDEIA_SearchClient implements IDEIA_SearchService {
  private rpc = createJsonRpcClient<IDEIA_SearchService>('/services/ideia-search');

  async search(query: string): Promise<SearchResult[]> { return this.rpc.search(query); }
}

@injectable()
export class IDEIA_SecurityClient implements IDEIA_SecurityService {
  private rpc = createJsonRpcClient<IDEIA_SecurityService>('/services/ideia-security');

  async getSecurityMetrics(): Promise<SecurityMetrics> { return this.rpc.getSecurityMetrics(); }
  async runComplianceCheck(framework?: string): Promise<ComplianceReport[]> { return this.rpc.runComplianceCheck(framework); }
}
