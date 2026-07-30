export type InteractionType =
  | 'ai_action_approved'
  | 'ai_action_rejected'
  | 'high_risk_action_accepted'
  | 'high_risk_action_rejected'
  | 'scanner_manual_run'
  | 'notification_dismissed'
  | 'notification_received'
  | 'feature_used'
  | 'command_run'
  | 'command.executed'
  | 'config.changed'
  | 'approval.granted'
  | 'approval.denied'
  | 'profile.applied'
  | 'suggestion.accepted'
  | 'suggestion.dismissed'
  | 'auto.fix.applied'
  | 'auto.fix.rejected';

export interface Interaction {
  id: string;
  type: string;
  source: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

export interface ObservationState {
  totalInteractions: number;
  byType: Record<string, number>;
  byHour: Record<string, number>;
  recentCommands: Array<{ command: string; count: number }>;
  periodStart: string;
  lastUpdated: string;
}

export const OBSERVATION_THRESHOLD = 50;
export const SUGGESTION_THRESHOLD = 200;
export const PHASE_OBSERVATION = 'observation' as const;
export const PHASE_SUGGESTION = 'suggestion' as const;
export const PHASE_AUTO = 'auto' as const;

export class UserInteractionTracker {
  private interactions: Interaction[] = [];
  private filePath?: string;

  constructor(filePathOrInteractions?: string | Interaction[]) {
    if (typeof filePathOrInteractions === 'string') {
      this.filePath = filePathOrInteractions;
    } else if (Array.isArray(filePathOrInteractions)) {
      this.interactions = [...filePathOrInteractions];
    }
  }

  record(
    type: string,
    source: string,
    metadata?: Record<string, unknown>,
    context?: Record<string, unknown>,
  ): Interaction {
    const interaction: Interaction = {
      id: crypto.randomUUID(),
      type,
      source,
      timestamp: new Date().toISOString(),
      metadata,
      context,
    };
    this.interactions.push(interaction);
    return interaction;
  }

  track(interaction: Interaction): void {
    this.interactions.push(interaction);
  }

  getInteractions(): Interaction[] {
    return [...this.interactions];
  }

  getCount(): number {
    return this.interactions.length;
  }

  getByType(type: string): number {
    return this.interactions.filter(i => i.type === type).length;
  }

  getPhase(): 'observation' | 'suggestion' | 'auto' {
    const count = this.getCount();
    if (count < OBSERVATION_THRESHOLD) return 'observation';
    if (count < SUGGESTION_THRESHOLD) return 'suggestion';
    return 'auto';
  }

  getState(): ObservationState {
    const byType: Record<string, number> = {};
    const byHour: Record<string, number> = {};
    const commandCounts = new Map<string, number>();
    let minTimestamp = this.interactions.length > 0
      ? this.interactions[0].timestamp
      : new Date().toISOString();
    let maxTimestamp = minTimestamp;

    for (const interaction of this.interactions) {
      byType[interaction.type] = (byType[interaction.type] || 0) + 1;
      const hourKey = interaction.timestamp.slice(0, 13);
      byHour[hourKey] = (byHour[hourKey] || 0) + 1;
      if (interaction.timestamp < minTimestamp) minTimestamp = interaction.timestamp;
      if (interaction.timestamp > maxTimestamp) maxTimestamp = interaction.timestamp;
      if (interaction.context?.command && typeof interaction.context.command === 'string') {
        commandCounts.set(
          interaction.context.command,
          (commandCounts.get(interaction.context.command) || 0) + 1,
        );
      }
    }

    const recentCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalInteractions: this.interactions.length,
      byType,
      byHour,
      recentCommands,
      periodStart: minTimestamp,
      lastUpdated: maxTimestamp,
    };
  }

  getRecent(limit?: number): Interaction[] {
    const n = limit ?? 50;
    return this.interactions.slice(-n);
  }

  getInteractionsSince(date: Date): Interaction[] {
    return this.interactions.filter(i => new Date(i.timestamp) > date);
  }

  clear(): void {
    this.interactions = [];
  }

  save(): void {
    if (!this.filePath) return;
    const { writeFileSync } = require('node:fs') as typeof import('node:fs');
    writeFileSync(this.filePath, JSON.stringify(this.interactions), 'utf-8');
  }

  load(): void {
    if (!this.filePath) throw new Error('No file path configured');
    const { existsSync, readFileSync } = require('node:fs') as typeof import('node:fs');
    if (!existsSync(this.filePath)) return;
    const raw = readFileSync(this.filePath, 'utf-8');
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) throw new Error('Invalid interaction file format');
    this.interactions = data as Interaction[];
  }
}
