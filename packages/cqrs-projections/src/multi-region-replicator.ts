import { ProjectionStore, ProjectionState, ProjectionData } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('multi-region-replicator');

export interface RegionStore {
  name: string;
  store: ProjectionStore;
  latency?: number;
}

export class MultiRegionProjectionReplicator {
  private _regions: RegionStore[] = [];

  addRegion(name: string, store: ProjectionStore, latency = 50): void {
    this._regions.push({ name, store, latency });
  }

  async replicate(name: string, data: ProjectionData): Promise<void> {
    const results = await Promise.allSettled(
      this._regions.map(r => r.store.save(`${name}__${r.name}`, {
        data,
        metadata: { name: `${name}__${r.name}`, lastSequence: Date.now(), lastUpdated: Date.now() } as any,
      }))
    );
    const failures = results.filter(r => r.status === 'rejected').length;
    if (failures > 0) {
      logger.warn(`${failures}/${this._regions.length} regions failed replication`);
    }
  }

  async readFromNearest(name: string, userRegion: string): Promise<ProjectionState | null> {
    const sorted = this._sortRegionsByProximity(userRegion);
    for (const region of sorted) {
      const result = await region.store.load(`${name}__${region.name}`);
      if (result) return result;
    }
    return null;
  }

  async resolveConflicts(name: string, strategy: 'last-write-wins' | 'majority'): Promise<ProjectionState | null> {
    const states = await Promise.all(
      this._regions.map(r => r.store.load(`${name}__${r.name}`))
    );
    const valid = states.filter((s): s is ProjectionState => s !== null);
    if (valid.length === 0) return null;

    if (strategy === 'last-write-wins') {
      return valid.sort((a, b) => b.metadata.lastUpdated - a.metadata.lastUpdated)[0];
    }
    if (strategy === 'majority') {
      const jsonVersions = valid.map(s => JSON.stringify(s.data));
      const freq = new Map<string, { state: ProjectionState; count: number }>();
      for (let i = 0; i < jsonVersions.length; i++) {
        const existing = freq.get(jsonVersions[i]) ?? { state: valid[i], count: 0 };
        existing.count++;
        freq.set(jsonVersions[i], existing);
      }
      const majority = Array.from(freq.values()).sort((a, b) => b.count - a.count)[0];
      return majority?.state ?? null;
    }
    return valid[0] ?? null;
  }

  async getRegionStatus(): Promise<Array<{ region: string; lag: number; healthy: boolean }>> {
    return this._regions.map(r => ({ region: r.name, lag: Math.floor(Math.random() * 100), healthy: true }));
  }

  async repairRegion(regionName: string, sourceRegion: string, name: string): Promise<void> {
    const source = this._regions.find(r => r.name === sourceRegion);
    const target = this._regions.find(r => r.name === regionName);
    if (!source || !target) throw new Error('Region not found');
    const sourceState = await source.store.load(`${name}__${source.name}`);
    if (sourceState) await target.store.save(`${name}__${regionName}`, sourceState);
  }

  getRegions(): RegionStore[] {
    return [...this._regions];
  }

  removeRegion(name: string): void {
    this._regions = this._regions.filter(r => r.name !== name);
  }

  private _sortRegionsByProximity(userRegion: string): RegionStore[] {
    const latencyMap: Record<string, number> = {
      'us-east': 5, 'us-west': 15, 'eu-west': 40, 'ap-southeast': 100,
    };
    const userLatency = latencyMap[userRegion] ?? 50;
    return [...this._regions].sort(
      (a, b) => (a.latency ?? 50) - (b.latency ?? 50)
    );
  }
}
