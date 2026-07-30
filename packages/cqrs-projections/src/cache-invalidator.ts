import { CacheInvalidationStrategy } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cache-invalidator');

export class CacheInvalidator implements CacheInvalidationStrategy {
  private _validUntil = new Map<string, number>();
  private _eventToProjections = new Map<string, Set<string>>();

  constructor(
    private _defaultTTL = 60000
  ) {}

  isExpired(projectionName: string, _lastUpdated: number): boolean {
    const valid = this._validUntil.get(projectionName);
    if (valid === undefined) return true;
    return Date.now() > valid;
  }

  invalidate(projectionName: string): void {
    this._validUntil.delete(projectionName);
  }

  register(projectionName: string, eventTypes: string[]): void {
    for (const type of eventTypes) {
      if (!this._eventToProjections.has(type)) {
        this._eventToProjections.set(type, new Set());
      }
      this._eventToProjections.get(type)!.add(projectionName);
    }
  }

  onEvent(eventType: string): void {
    const projections = this._eventToProjections.get(eventType);
    if (projections) {
      for (const proj of projections) {
        this.invalidate(proj);
      }
    }
  }

  refresh(projectionName: string, ttlMs = 30000): void {
    this._validUntil.set(projectionName, Date.now() + ttlMs);
  }

  clear(): void {
    this._validUntil.clear();
  }
}

export class VersionStampCache<T> {
  private _cache = new Map<string, { data: T; version: number; storedAt: number }>();

  constructor(private _maxAge = 60000) {}

  get(key: string, currentVersion: number): T | null {
    const entry = this._cache.get(key);
    if (!entry) return null;
    if (entry.version !== currentVersion) {
      this._cache.delete(key);
      return null;
    }
    if (Date.now() - entry.storedAt > this._maxAge) {
      this._cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T, version: number): void {
    this._cache.set(key, { data, version, storedAt: Date.now() });
  }

  invalidate(key: string): void {
    this._cache.delete(key);
  }

  clear(): void {
    this._cache.clear();
  }

  size(): number {
    return this._cache.size;
  }
}
