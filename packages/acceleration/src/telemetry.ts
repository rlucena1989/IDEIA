import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { TelemetryEvent } from './types';
const logger = createLogger('telemetry');

export class Telemetry {
  private events: TelemetryEvent[] = [];

  constructor(private file: string) {
    this.load();
  }

  private load() {
    if (!fs.existsSync(this.file)) return;
    try {
      this.events = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      this.events = [];
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.events, null, 2), 'utf8');
  }

  emit(type: string, data: Record<string, unknown> = {}) {
    this.events.push({ type, timestamp: new Date().toISOString(), data });
    this.save();
  }

  getAll(): TelemetryEvent[] {
    return [...this.events];
  }
}
