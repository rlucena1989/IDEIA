import fs from 'node:fs';
import { createLogger } from '@ideia/logger';
import path from 'node:path';
import { MetricEntry } from './types';
const logger = createLogger('metrics-store');

export class MetricsStore {
  private entries: MetricEntry[] = [];

  constructor(private file: string) {
    this.load();
  }

  private load() {
    if (!fs.existsSync(this.file)) return;
    try {
      this.entries = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      this.entries = [];
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.entries, null, 2), 'utf8');
  }

  record(name: string, value: number, tags?: Record<string, string>) {
    this.entries.push({ name, value, timestamp: new Date().toISOString(), tags });
    this.save();
  }

  getAll(): MetricEntry[] {
    return [...this.entries];
  }
}
