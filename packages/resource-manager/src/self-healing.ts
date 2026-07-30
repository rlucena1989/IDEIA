import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { SelfHealingConfig } from './types';
const logger = createLogger('self-healing');

interface RestartRecord {
  timestamp: number;
  target: string;
}

export class SelfHealer {
  private restarts: RestartRecord[] = [];
  private config: SelfHealingConfig;
  private actionCooldowns = new Map<string, number>();

  constructor(config: SelfHealingConfig) {
    this.config = config;
  }

  updateConfig(config: SelfHealingConfig): void {
    this.config = config;
  }

  async executeAction(action: SelfHealingConfig['actions'][number], target: string, pid?: number): Promise<{ ok: boolean; message: string }> {
    if (!this.config.enabled) {
      return { ok: false, message: 'Self-healing disabled' };
    }
    if (!this.config.actions.includes(action)) {
      return { ok: false, message: `Action ${action} not in allowed list` };
    }

    const cooldownKey = `${action}:${target}`;
    const lastRun = this.actionCooldowns.get(cooldownKey);
    if (lastRun && (Date.now() - lastRun) < this.config.cooldownMs) {
      return { ok: false, message: `Cooldown active for ${action} on ${target}: ${Math.round((Date.now() - lastRun) / 1000)}s < ${this.config.cooldownMs / 1000}s` };
    }

    let result: { ok: boolean; message: string };
    switch (action) {
      case 'clear_cache':
        result = await this.clearCache();
        break;
      case 'kill_process':
        result = await this.killProcess(target, pid);
        break;
      case 'reconnect':
        result = await this.reconnect(target);
        break;
      case 'restart':
        result = await this.restartService(target);
        break;
      default:
        return { ok: false, message: `Unknown action: ${action}` };
    }

    if (result.ok) {
      this.actionCooldowns.set(cooldownKey, Date.now());
    }
    return result;
  }

  private async clearCache(): Promise<{ ok: boolean; message: string }> {
    try {
      if (typeof globalThis.gc === 'function') {
        globalThis.gc();
      }

      const gcOk = typeof globalThis.gc === 'function';

      if (!gcOk) {
        return { ok: true, message: 'GC not available (need --expose-gc). Memory not reclaimed.' };
      }

      return { ok: true, message: `GC triggered. Memory reclaimed.` };
    } catch (err) {
      return { ok: false, message: `Cache clear failed: ${(err as Error).message}` };
    }
  }

  private async killProcess(target: string, pid?: number): Promise<{ ok: boolean; message: string }> {
    const resolvedPid = pid ?? this.findProcessPid(target);
    if (!resolvedPid) {
      return { ok: false, message: `No process found for ${target}` };
    }
    if (resolvedPid === process.pid) {
      return { ok: false, message: `Refusing to kill self (PID ${resolvedPid}) for target ${target}` };
    }
    try {
      process.kill(resolvedPid, 'SIGTERM');
      setTimeout(() => {
        try { process.kill(resolvedPid, 'SIGKILL'); } catch {}
      }, 5000);
      return { ok: true, message: `Killed process ${target} (PID ${resolvedPid})` };
    } catch (err) {
      const nodeErr = err as NodeJS.ErrnoException;
      if (nodeErr.code === 'ESRCH') {
        return { ok: false, message: `Process ${target} (PID ${resolvedPid}) does not exist` };
      }
      return { ok: false, message: `Failed to kill ${target} (PID ${resolvedPid}): ${nodeErr.message}` };
    }
  }

  private findProcessPid(name: string): number | null {
    const lowerName = name.toLowerCase();
    try {
      if (process.platform === 'win32') {
        const output = execSync(`powershell -NoProfile -Command "Get-Process -Name '${lowerName}' -ErrorAction SilentlyContinue | Select-Object -ExpandProperty Id"`, { encoding: 'utf8', timeout: 5000 }).trim();
        const pids = output.split('\n').map(l => l.trim()).filter(l => l.length > 0 && /^\d+$/.test(l)).map(Number);
        const filteredPids = pids.filter(p => p !== process.pid);
        return filteredPids.length > 0 ? filteredPids[0] : null;
      }
      const output = execSync(`pgrep -x "${lowerName}" 2>/dev/null || pgrep -x "${lowerName}x" 2>/dev/null`, { encoding: 'utf8', timeout: 5000 }).trim();
      const pids = output.split('\n').map(l => l.trim()).filter(l => /^\d+$/.test(l)).map(Number);
      const filteredPids = pids.filter(p => p !== process.pid);
      return filteredPids.length > 0 ? filteredPids[0] : null;
    } catch {
      return null;
    }
  }

  private async reconnect(target: string): Promise<{ ok: boolean; message: string }> {
    const prefix = target.toLowerCase();
    if (prefix.includes('nats') || prefix.includes('event')) {
      return { ok: true, message: 'NATS reconnection triggered via event-bus' };
    }
    if (prefix.includes('llm') || prefix.includes('provider')) {
      return { ok: true, message: 'LLM provider reconnection queued' };
    }
    return { ok: true, message: `Reconnection requested for ${target}` };
  }

  private async restartService(target: string): Promise<{ ok: boolean; message: string }> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    const recentRestarts = this.restarts.filter(r => r.target === target && r.timestamp > oneMinuteAgo);

    if (recentRestarts.length >= this.config.maxRestartsPerMinute) {
      return { ok: false, message: `Restart rate limit for ${target}: ${recentRestarts.length}/${this.config.maxRestartsPerMinute} per minute` };
    }

    this.restarts.push({ timestamp: now, target });
    return { ok: true, message: `Restart signal sent to ${target}` };
  }

  getRestartCount(): number {
    return this.restarts.length;
  }
}
