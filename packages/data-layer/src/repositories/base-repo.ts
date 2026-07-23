import { DatabaseAdapter, DataLayerConfig as _DataLayerConfig } from '../types';

export type DbType = 'postgres' | 'sqlite';

const PG_PLACEHOLDER = (i: number) => `$${i + 1}`;
const SQLITE_PLACEHOLDER = () => '?';

export abstract class BaseRepository {
  protected adapter: DatabaseAdapter;
  protected dbType: DbType;

  constructor(adapter: DatabaseAdapter, dbType: DbType = 'sqlite') {
    this.adapter = adapter;
    this.dbType = dbType;
  }

  protected ph(i: number): string {
    return this.dbType === 'postgres' ? PG_PLACEHOLDER(i) : SQLITE_PLACEHOLDER();
  }

  protected param(value: unknown): unknown {
    if (this.dbType === 'postgres') return value;
    if (typeof value === 'object' && value !== null) return JSON.stringify(value);
    return value;
  }

  protected supportsReturning(): boolean {
    return this.dbType === 'postgres';
  }

  protected now(): string {
    return this.dbType === 'postgres' ? 'NOW()' : "datetime('now')";
  }
}
