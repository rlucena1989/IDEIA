import { createLogger } from '@ideia/logger';

const log = createLogger('config-engine:context-switcher');

export type UserContext = 'coding' | 'debugging' | 'reviewing' | 'learning' | 'presenting' | 'unknown';

export interface ContextSwitchEvent {
  from: UserContext;
  to: UserContext;
  timestamp: number;
  trigger: string;
}

export class ContextSwitcher {
  private currentContext: UserContext = 'unknown';
  private history: ContextSwitchEvent[] = [];
  private listeners: Array<(event: ContextSwitchEvent) => void> = [];
  private autoSwitchEnabled = true;

  getCurrent(): UserContext {
    return this.currentContext;
  }

  getCurrentContext(): UserContext {
    return this.currentContext;
  }

  setContext(context: UserContext, trigger = 'manual'): void {
    if (context === this.currentContext) return;
    const event: ContextSwitchEvent = {
      from: this.currentContext,
      to: context,
      timestamp: Date.now(),
      trigger,
    };
    this.currentContext = context;
    this.history.push(event);
    if (this.history.length > 100) this.history.shift();
    log.info(`Context switched: ${event.from} → ${event.to} (${trigger})`);
    for (const listener of this.listeners) listener(event);
  }

  onSwitch(listener: (event: ContextSwitchEvent) => void): () => void {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  getHistory(limit = 10): ContextSwitchEvent[] {
    return this.history.slice(-limit);
  }

  enableAutoSwitch(): void { this.autoSwitchEnabled = true; }
  disableAutoSwitch(): void { this.autoSwitchEnabled = false; }
  isAutoSwitchEnabled(): boolean { return this.autoSwitchEnabled; }

  getUserContexts(): UserContext[] {
    return ['coding', 'debugging', 'reviewing', 'learning', 'presenting', 'unknown'];
  }

  switchTo(context: UserContext): void {
    this.setContext(context, 'manual');
  }

  autoDetect(): UserContext {
    const detected = this.detectFromActivity({ commands: process.argv, files: [] });
    if (detected !== this.currentContext && this.autoSwitchEnabled) {
      this.setContext(detected, 'auto-detect');
    }
    return this.currentContext;
  }

  detectFromActivity(activity: { commands?: string[]; files?: string[]; time?: Date }): UserContext {
    const commands = activity.commands ?? [];
    const files = activity.files ?? [];
    if (commands.some(c => c.includes('debug') || c.includes('inspect'))) return 'debugging';
    if (commands.some(c => c.includes('review') || c.includes('check'))) return 'reviewing';
    if (commands.some(c => c.includes('learn') || c.includes('doc') || c.includes('help'))) return 'learning';
    if (commands.some(c => c.includes('present') || c.includes('demo'))) return 'presenting';
    if (files.some(f => f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.py'))) return 'coding';
    return this.currentContext;
  }

  autoSwitch(activity: { commands?: string[]; files?: string[]; time?: Date }): void {
    if (!this.autoSwitchEnabled) return;
    const detected = this.detectFromActivity(activity);
    if (detected !== this.currentContext) {
      this.setContext(detected, 'auto-detect');
    }
  }
}

export function createContextSwitcher(): ContextSwitcher {
  return new ContextSwitcher();
}
