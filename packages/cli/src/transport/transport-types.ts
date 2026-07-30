export interface TransportRequest {
  command: string;
  args: string[];
  flags: Record<string, unknown>;
  rawArgv: string[];
  cwd: string;
}

export interface TransportResponse {
  ok: boolean;
  code: number;
  message: string;
  data?: unknown;
  error?: { name?: string; message: string; details?: unknown };
}

export interface AdapterConfig {
  json: boolean;
  verbose: boolean;
  dryRun: boolean;
}
