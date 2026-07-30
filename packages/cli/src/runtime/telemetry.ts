/** Interface que define a estrutura de telemetry event. */
export interface TelemetryEvent {
  event: string;
  command: string;
  status: 'success' | 'error';
  durationMs: number;
  adapter?: string;
  template?: string;
  timestamp: string;
  sessionId?: string;
}

/** Interface que define a estrutura de telemetry aggregate. */
export interface TelemetryAggregate {
  date: string;
  totalCommands: number;
  successRate: number;
  avgDurationMs: number;
  topCommands: Array<{ command: string; count: number }>;
  topErrors: Array<{ command: string; count: number }>;
  adapterUsage: Record<string, number>;
}

import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';

const TELEMETRY_DIR = '.ai/reports/telemetry';
const EVENTS_LOG = 'events.jsonl';

function eventsPath(root: string): string {
  return path.join(root, TELEMETRY_DIR, EVENTS_LOG);
}

/**
 * Processa event.
 * @param root - Valor root.
 * @param event - Valor event.
 */
export function recordEvent(root: string, event: Omit<TelemetryEvent, 'timestamp'>): void {
  const full: TelemetryEvent = { ...event, timestamp: new Date().toISOString() };
  const ep = eventsPath(root);
  fs.mkdirSync(path.dirname(ep), { recursive: true });
  fs.appendFileSync(ep, JSON.stringify(full) + '\n');
}

/**
 * Lê events.
 * @param root - Valor root.
 * @param limit - Valor limit.
 * @returns O resultado da operação.
 */
export function readEvents(root: string, limit: number = 1000): TelemetryEvent[] {
  const ep = eventsPath(root);
  if (!fs.existsSync(ep)) return [];
  const lines = fs.readFileSync(ep, 'utf8').trim().split('\n').filter(Boolean);
  return lines.slice(-limit).map(l => { try { return JSON.parse(l) as TelemetryEvent; } catch { return null; } }).filter((e): e is TelemetryEvent => e !== null);
}

/**
 * Processa aggregate.
 * @param events - Valor events.
 * @returns O resultado da operação.
 */
export function computeAggregate(events: TelemetryEvent[]): TelemetryAggregate {
  const commandCounts: Record<string, number> = {};
  const errorCounts: Record<string, number> = {};
  const adapterUsage: Record<string, number> = {};
  let totalMs = 0;
  let successCount = 0;

  for (const e of events) {
    commandCounts[e.command] = (commandCounts[e.command] || 0) + 1;
    totalMs += e.durationMs;
    if (e.status === 'success') successCount++;
    else errorCounts[e.command] = (errorCounts[e.command] || 0) + 1;
    if (e.adapter) adapterUsage[e.adapter] = (adapterUsage[e.adapter] || 0) + 1;
  }

  const topCommands = Object.entries(commandCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([command, count]) => ({ command, count }));
  const topErrors = Object.entries(errorCounts).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([command, count]) => ({ command, count }));

  return {
    date: new Date().toISOString().substring(0, 10),
    totalCommands: events.length,
    successRate: events.length > 0 ? (successCount / events.length) * 100 : 0,
    avgDurationMs: events.length > 0 ? Math.round(totalMs / events.length) : 0,
    topCommands, topErrors, adapterUsage,
  };
}