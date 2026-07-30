import { createLogger } from '@ideia/logger';
import type { DatabaseAdapter } from './types';
import { DataLineageTracker, LineageEvent} from './lineage-tracker';

const logger = createLogger('data-layer:lineage-persistent');

const SCHEMA_SQL = `
  CREATE TABLE IF NOT EXISTS ideia_lineage (
    id TEXT PRIMARY KEY,
    data_id TEXT NOT NULL,
    source_component TEXT NOT NULL,
    source_data_id TEXT,
    operation TEXT NOT NULL,
    target_component TEXT,
    metadata TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_lineage_data_id ON ideia_lineage(data_id);
  CREATE INDEX IF NOT EXISTS idx_lineage_source_data ON ideia_lineage(source_data_id);
  CREATE INDEX IF NOT EXISTS idx_lineage_component ON ideia_lineage(source_component);
  CREATE INDEX IF NOT EXISTS idx_lineage_operation ON ideia_lineage(operation);
  CREATE INDEX IF NOT EXISTS idx_lineage_timestamp ON ideia_lineage(timestamp);
`;

export class PersistentLineageTracker extends DataLineageTracker {
  private adapter: DatabaseAdapter | null;
  private schemaEnsured = false;

  constructor(adapter?: DatabaseAdapter, maxEvents = 100000) {
    super(maxEvents);
    this.adapter = adapter || null;
  }

  setAdapter(adapter: DatabaseAdapter): void {
    this.adapter = adapter;
  }

  async ensureSchema(): Promise<void> {
    if (this.schemaEnsured || !this.adapter) return;
    try {
      await this.adapter.query(SCHEMA_SQL);
      this.schemaEnsured = true;
    } catch (e) {
      logger.warn('Lineage schema creation failed', { error: String(e) });
    }
  }

  async loadFromDb(): Promise<number> {
    if (!this.adapter) return 0;
    await this.ensureSchema();
    try {
      const result = await this.adapter.query<LineageEvent>(
        'SELECT * FROM ideia_lineage ORDER BY timestamp ASC LIMIT ?',
        [this.maxEvents]
      );
      for (const row of result.rows) {
        super.record({
          dataId: row.dataId,
          sourceComponent: row.sourceComponent,
          sourceDataId: row.sourceDataId,
          operation: row.operation as LineageEvent['operation'],
          targetComponent: row.targetComponent,
          metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
        });
      }
      logger.info(`Lineage loaded from DB: ${result.rows.length} events`);
      return result.rows.length;
    } catch (e) {
      logger.warn('Lineage load from DB failed', { error: String(e) });
      return 0;
    }
  }

  override record(event: Omit<LineageEvent, 'id' | 'timestamp'>): LineageEvent {
    const evt = super.record(event);
    this.persistEvent(evt).catch(e =>
      logger.warn('Lineage persist failed', { id: evt.id, error: String(e) })
    );
    return evt;
  }

  override recordCreate(dataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceComponent: component, operation: 'create', metadata });
  }

  override recordTransform(dataId: string, sourceDataId: string, component: string, targetComponent?: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceDataId, sourceComponent: component, operation: 'transform', targetComponent, metadata });
  }

  override recordMerge(dataId: string, sourceDataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceDataId, sourceComponent: component, operation: 'merge', metadata });
  }

  override recordCopy(dataId: string, sourceDataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceDataId, sourceComponent: component, operation: 'copy', metadata });
  }

  override recordDelete(dataId: string, component: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceComponent: component, operation: 'delete', metadata });
  }

  override recordImport(dataId: string, sourceComponent: string, sourceDataId?: string, metadata?: Record<string, unknown>): LineageEvent {
    return this.record({ dataId, sourceComponent, sourceDataId, operation: 'import', metadata });
  }

  override async clear(): Promise<void> {
    super.clear();
    if (this.adapter) {
      try {
        await this.adapter.query('DELETE FROM ideia_lineage');
        logger.info('Lineage DB cleared');
      } catch (e) {
        logger.warn('Lineage DB clear failed', { error: String(e) });
      }
    }
  }

  override getStats(): { totalEvents: number; uniqueDataIds: number; uniqueComponents: number; persisted: boolean } {
    const base = super.getStats();
    return { ...base, persisted: this.schemaEnsured };
  }

  private async persistEvent(event: LineageEvent): Promise<void> {
    if (!this.adapter || !this.schemaEnsured) return;
    try {
      await this.adapter.query(
        `INSERT OR IGNORE INTO ideia_lineage (id, data_id, source_component, source_data_id, operation, target_component, metadata, timestamp, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [event.id, event.dataId, event.sourceComponent, event.sourceDataId || null,
         event.operation, event.targetComponent || null,
         JSON.stringify(event.metadata || {}), event.timestamp, new Date().toISOString()]
      );
    } catch (e) {
      logger.warn('Lineage event persist failed', { id: event.id, error: String(e) });
    }
  }
}

export function createPersistentLineageTracker(adapter?: DatabaseAdapter, maxEvents?: number): PersistentLineageTracker {
  return new PersistentLineageTracker(adapter, maxEvents);
}
