import type { ClientConfig, CommandResult, StatusResult, LogEntry } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('client');

export class IdeiaClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: ClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    this.apiKey = config.apiKey;
  }

  private async request<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }
    const response = await fetch(`${this.baseUrl}${path}`, { ...options, headers });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json() as Promise<T>;
  }

  async status(): Promise<StatusResult> {
    return this.request<StatusResult>('/api/status');
  }

  async runCommand(name: string, args?: string[]): Promise<CommandResult> {
    return this.request<CommandResult>('/api/command', {
      method: 'POST',
      body: JSON.stringify({ name, args }),
    });
  }

  async executePlan(planId: string): Promise<CommandResult> {
    return this.request<CommandResult>('/api/plan/execute', {
      method: 'POST',
      body: JSON.stringify({ planId }),
    });
  }

  async getLogs(): Promise<LogEntry[]> {
    return this.request<LogEntry[]>('/api/logs');
  }

  async getConfig(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/api/config');
  }
}
