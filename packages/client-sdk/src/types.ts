export interface ClientConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface CommandResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StatusResult {
  status: string;
  uptime: number;
  memory: { rss: number; heapTotal: number; heapUsed: number };
}

export interface LogEntry {
  id: string;
  level: string;
  message: string;
  timestamp: string;
}
