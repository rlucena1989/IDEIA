import { CyclicDependencyError, DependencyNotFoundError } from './registry-errors';
import { ContextPack } from './types';

export class DependencyResolver {
  constructor(private _registry: { get: (name: string, version?: string) => Promise<ContextPack | null> }) {}

  async resolve(pack: ContextPack): Promise<ContextPack[]> {
    const resolved: ContextPack[] = [];
    const visiting = new Set<string>();
    const visited = new Set<string>();
    await this._resolveRecursive(pack, resolved, visiting, visited);
    return resolved;
  }

  private async _resolveRecursive(pack: ContextPack, resolved: ContextPack[], visiting: Set<string>, visited: Set<string>): Promise<void> {
    const packKey = `${pack.name}@${pack.version}`;
    if (visited.has(packKey)) return;
    if (visiting.has(packKey)) throw new CyclicDependencyError(pack.name, Array.from(visiting));

    visiting.add(packKey);
    for (const dep of pack.dependencies) {
      if (!dep.required) {
        try { const depPack = await this._registry.get(dep.pack); if (depPack) await this._resolveRecursive(depPack, resolved, visiting, visited); } catch { continue; }
      } else {
        const effectiveVersion = dep.version.replace(/^[\^~>=<\s]+/, '') || undefined;
        const depPack = await this._registry.get(dep.pack, effectiveVersion);
        if (!depPack) throw new DependencyNotFoundError(dep.pack, pack.name);
        await this._resolveRecursive(depPack, resolved, visiting, visited);
      }
    }
    visiting.delete(packKey);
    visited.add(packKey);
    resolved.push(pack);
  }
}
