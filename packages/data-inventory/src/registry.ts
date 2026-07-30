import { v4 as uuidv4 } from 'uuid';
import { createLogger } from '@ideia/logger';
import { DataAssetSchema, type DataAsset, type DataAssetType, type DataInventoryReport, type DataInventoryConfig } from './types';

const logger = createLogger('data-inventory:registry');

export class DataInventoryRegistry {
  private assets: Map<string, DataAsset> = new Map();
  private config: DataInventoryConfig;

  constructor(config?: Partial<DataInventoryConfig>) {
    this.config = {
      autoScan: false,
      scanIntervalMs: 86400000,
      alertOnStaleDays: 90,
      ...config,
    };
  }

  register(params: Omit<DataAsset, 'id' | 'createdAt' | 'updatedAt'>): DataAsset {
    const now = new Date();
    const asset: DataAsset = {
      id: uuidv4(),
      ...params,
      createdAt: now,
      updatedAt: now,
    };
    const parsed = DataAssetSchema.parse(asset);
    this.assets.set(parsed.id, parsed);
    logger.info(`Registered asset ${parsed.id} (${parsed.name})`);
    return parsed;
  }

  unregister(id: string): boolean {
    const existed = this.assets.delete(id);
    if (existed) {
      logger.info(`Unregistered asset ${id}`);
    }
    return existed;
  }

  find(id: string): DataAsset | undefined {
    return this.assets.get(id);
  }

  search(query: string): DataAsset[] {
    const lower = query.toLowerCase();
    return Array.from(this.assets.values()).filter(a =>
      a.name.toLowerCase().includes(lower) ||
      a.location.toLowerCase().includes(lower) ||
      a.owner.toLowerCase().includes(lower) ||
      a.tags.some(t => t.toLowerCase().includes(lower))
    );
  }

  list(): DataAsset[] {
    return Array.from(this.assets.values());
  }

  getReport(): DataInventoryReport {
    const all = Array.from(this.assets.values());
    const byType = {} as Record<DataAssetType, number>;
    for (const t of ['personal', 'sensitive', 'confidential', 'public'] as DataAssetType[]) {
      byType[t] = 0;
    }
    for (const a of all) {
      byType[a.type] = (byType[a.type] || 0) + 1;
    }
    const now = Date.now();
    const staleAssets = all.filter(a =>
      now - a.updatedAt.getTime() > this.config.alertOnStaleDays * 86400000
    ).length;
    const unclassified = all.filter(a => a.tags.length === 0).length;

    return {
      totalAssets: this.assets.size,
      byType,
      unclassified,
      staleAssets,
    };
  }

  getStats(): { total: number; byType: Record<DataAssetType, number> } {
    const byType = {} as Record<DataAssetType, number>;
    for (const a of this.assets.values()) {
      byType[a.type] = (byType[a.type] || 0) + 1;
    }
    return { total: this.assets.size, byType };
  }
}
