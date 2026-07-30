import { SyncManifest, EdgeConflict } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('sync');

export class EdgeSync {
  private manifests: Map<string, SyncManifest> = new Map();
  private maxRetries = 10;

  register(id: string, source: string, target: string): SyncManifest {
    const manifest: SyncManifest = { id, source, target, version: 1, lastSync: Date.now(), conflicts: [] };
    this.manifests.set(id, manifest);
    return manifest;
  }

  sync(id: string, localVersion: number): { success: boolean; newVersion?: number; conflicts: EdgeConflict[] } {
    const manifest = this.manifests.get(id);
    if (!manifest) return { success: false, conflicts: [] };
    if (localVersion < manifest.version) {
      manifest.conflicts.push({ key: `v${localVersion}`, localValue: localVersion, remoteValue: manifest.version, strategy: 'lww', resolved: true, resolvedAt: Date.now() });
    }
    manifest.version++;
    manifest.lastSync = Date.now();
    return { success: true, newVersion: manifest.version, conflicts: manifest.conflicts.filter(c => !c.resolved) };
  }

  resolveConflict(manifestId: string, key: string, _resolution: unknown): boolean {
    const manifest = this.manifests.get(manifestId);
    if (!manifest) return false;
    const conflict = manifest.conflicts.find(c => c.key === key && !c.resolved);
    if (!conflict) return false;
    conflict.resolved = true;
    conflict.resolvedAt = Date.now();
    return true;
  }

  getManifest(id: string): SyncManifest | undefined { return this.manifests.get(id); }
}
