import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('output-contract');

export interface CommandOutputEnvelope<T = unknown> {
  ok: boolean;
  command: string;
  version: string;
  generatedAt: string;
  requestId: string;
  data?: T;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, string | number | boolean>;
}

export function createEnvelope<T>(params: {
  ok: boolean;
  command: string;
  version: string;
  data?: T;
  warnings?: string[];
  errors?: string[];
  metadata?: Record<string, string | number | boolean>;
}): CommandOutputEnvelope<T> {
  return {
    ok: params.ok,
    command: params.command,
    version: params.version,
    generatedAt: new Date().toISOString(),
    requestId: crypto.randomUUID(),
    data: params.data,
    warnings: params.warnings ?? [],
    errors: params.errors ?? [],
    metadata: params.metadata ?? {},
  };
}

export function createOkOutput<T>(
  command: string,
  version: string,
  data: T,
  warnings: string[] = []
): CommandOutputEnvelope<T> {
  return createEnvelope({ ok: true, command, version, data, warnings });
}

export function createErrorOutput(
  command: string,
  version: string,
  errors: string[],
  warnings: string[] = []
): CommandOutputEnvelope<never> {
  return createEnvelope({ ok: false, command, version, errors, warnings });
}
