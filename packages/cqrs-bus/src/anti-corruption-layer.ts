import { v4 as uuid } from 'uuid';
import { createLogger } from '@ideia/logger';
import { Command } from './command-bus';
const logger = createLogger('anti-corruption-layer');

export interface ExternalCommand {
  source: string;
  action: string;
  payload: Record<string, unknown>;
  correlationId: string;
}

export class AntiCorruptionLayer {
  translate(command: ExternalCommand): Command {
    return {
      id: uuid(),
      type: this.mapType(command.source, command.action),
      aggregateId: this.mapId(command.source, command.payload['id'] as string),
      data: this.mapData(command.source, command.payload),
      metadata: {
        agentId: `system:${command.source}`,
        timestamp: Date.now(),
        correlationId: command.correlationId,
      },
    };
  }

  private mapType(source: string, action: string): string {
    const mapping: Record<string, Record<string, string>> = {
      github: { push: 'project.sync', pr_merged: 'project.merge' },
      vscode: { save: 'document.update', open: 'document.open' },
      webhook: { generic: 'external.event' },
    };
    return mapping[source]?.[action] ?? `external.${action}`;
  }

  private mapId(source: string, id?: string): string {
    return id ? `${source}:${id}` : uuid();
  }

  private mapData(source: string, payload: Record<string, unknown>): Record<string, unknown> {
    return { ...payload, _source: source, _translatedAt: Date.now() };
  }
}
