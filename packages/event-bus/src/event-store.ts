import type { DomainEvent, IEventStore } from './types-event-sourcing';
import { createLogger } from '@ideia/logger';
import { ConcurrencyError } from './types-event-sourcing';
const logger = createLogger('event-store');

export class InMemoryEventStore implements IEventStore {
  private events: Map<string, DomainEvent[]> = new Map();
  private aggregateVersions: Map<string, number> = new Map();

  private key(aggregateType: string, aggregateId: string): string {
    return `${aggregateType}.${aggregateId}`;
  }

  async appendEvents(
    aggregateType: string,
    aggregateId: string,
    events: DomainEvent[],
    expectedVersion: number,
  ): Promise<void> {
    const k = this.key(aggregateType, aggregateId);
    const currentVersion = this.aggregateVersions.get(k) ?? 0;

    if (events.length === 0) {
      return;
    }

    if (expectedVersion !== currentVersion) {
      const existing = this.events.get(k) ?? [];
      const existingVersions = new Set(existing.map((e) => e.version));
      const allDuplicate = events.every((e) => existingVersions.has(e.version));
      if (allDuplicate) {
        return;
      }
      throw new ConcurrencyError(
        `Expected version ${expectedVersion}, current ${currentVersion} for ${k}`,
        expectedVersion,
        currentVersion,
        aggregateType,
        aggregateId,
      );
    }

    const existing = this.events.get(k) ?? [];
    this.events.set(k, [...existing, ...events]);
    this.aggregateVersions.set(k, events[events.length - 1].version);
  }

  async loadEvents(aggregateType: string, aggregateId: string): Promise<DomainEvent[]> {
    const k = this.key(aggregateType, aggregateId);
    const result = this.events.get(k);
    if (result === undefined) {
      return [];
    }
    return [...result].sort((a, b) => a.version - b.version);
  }

  async loadEventsSince(
    aggregateType: string,
    aggregateId: string,
    fromVersion: number,
  ): Promise<DomainEvent[]> {
    const k = this.key(aggregateType, aggregateId);
    const result = this.events.get(k);
    if (result === undefined) {
      return [];
    }
    return result
      .filter((e) => e.version > fromVersion)
      .sort((a, b) => a.version - b.version);
  }

  async *loadAllEvents(aggregateType: string): AsyncGenerator<DomainEvent> {
    const prefix = `${aggregateType}.`;
    for (const [k, evts] of this.events) {
      if (k.startsWith(prefix)) {
        for (const event of evts.sort((a, b) => a.version - b.version)) {
          yield event;
        }
      }
    }
  }

  async getAggregateVersion(aggregateType: string, aggregateId: string): Promise<number> {
    const k = this.key(aggregateType, aggregateId);
    return this.aggregateVersions.get(k) ?? 0;
  }
}
