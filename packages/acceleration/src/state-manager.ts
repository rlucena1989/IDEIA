import fs from 'node:fs';
import path from 'node:path';
import { EngineState } from './types';

export class StateManager {
  private state: EngineState = { failures: 0, successes: 0 };

  constructor(private file: string) {
    this.load();
  }

  private load() {
    if (!fs.existsSync(this.file)) return;
    try {
      this.state = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      this.state = { failures: 0, successes: 0 };
    }
  }

  private save() {
    fs.mkdirSync(path.dirname(this.file), { recursive: true });
    fs.writeFileSync(this.file, JSON.stringify(this.state, null, 2), 'utf8');
  }

  markSuccess(mode: string, data: Partial<EngineState> = {}) {
    this.state.lastMode = mode;
    this.state.lastRunAt = new Date().toISOString();
    this.state.lastSuccess = true;
    this.state.successes += 1;
    Object.assign(this.state, data);
    this.save();
  }

  markFailure(mode: string, data: Partial<EngineState> = {}) {
    this.state.lastMode = mode;
    this.state.lastRunAt = new Date().toISOString();
    this.state.lastSuccess = false;
    this.state.failures += 1;
    Object.assign(this.state, data);
    this.save();
  }

  getState(): EngineState {
    return { ...this.state };
  }
}
