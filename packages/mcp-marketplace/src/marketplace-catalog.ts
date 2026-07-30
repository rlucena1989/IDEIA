import { MarketplacePackage, PackageSource, PermissionTier } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('marketplace-catalog');

export class MarketplaceCatalog {
  private _packages: Map<string, MarketplacePackage> = new Map();
  private _categories: Map<string, MarketplacePackage[]> = new Map();

  addPackage(pkg: MarketplacePackage): void {
    const key = `${pkg.name}@${pkg.version}`;
    this._packages.set(key, pkg);
    const category = pkg.category || 'uncategorized';
    const existing = this._categories.get(category) ?? [];
    existing.push(pkg);
    this._categories.set(category, existing);
  }

  removePackage(name: string, version?: string): boolean {
    if (version) {
      const key = `${name}@${version}`;
      const pkg = this._packages.get(key);
      if (pkg) {
        this._packages.delete(key);
        this._rebuildCategories();
        return true;
      }
      return false;
    }
    const keys = Array.from(this._packages.keys()).filter(k => k.startsWith(`${name}@`));
    for (const key of keys) this._packages.delete(key);
    this._rebuildCategories();
    return keys.length > 0;
  }

  getPackage(name: string, version?: string): MarketplacePackage | undefined {
    if (version) return this._packages.get(`${name}@${version}`);
    const versions = this.getVersions(name);
    return versions.sort((a, b) => b.version.localeCompare(a.version))[0];
  }

  getVersions(name: string): MarketplacePackage[] {
    return Array.from(this._packages.values()).filter(p => p.name === name);
  }

  listPackages(): MarketplacePackage[] {
    return Array.from(this._packages.values());
  }

  listByCategory(category: string): MarketplacePackage[] {
    return this._categories.get(category) ?? [];
  }

  listBySource(source: PackageSource): MarketplacePackage[] {
    return this.listPackages().filter(p => p.source === source);
  }

  listByPermission(tier: PermissionTier): MarketplacePackage[] {
    return this.listPackages().filter(p => p.permissions.includes(tier));
  }

  getCategories(): string[] {
    return Array.from(this._categories.keys());
  }

  search(query: string): MarketplacePackage[] {
    const lower = query.toLowerCase();
    return this.listPackages().filter(p =>
      p.name.toLowerCase().includes(lower) ||
      p.description.toLowerCase().includes(lower) ||
      p.tags.some(t => t.toLowerCase().includes(lower)),
    );
  }

  searchByQuality(query: string, minTier?: string): MarketplacePackage[] {
    const results = this.search(query);
    if (minTier) {
      const tierOrder = ['bronze', 'silver', 'gold', 'platinum'];
      const minIdx = tierOrder.indexOf(minTier);
      return results.filter(p => {
        const pkgTier = (p.metadata?.scoreTier as string) ?? 'bronze';
        return tierOrder.indexOf(pkgTier) >= minIdx;
      });
    }
    return results;
  }

  getPackageCount(): number {
    return this._packages.size;
  }

  clear(): void {
    this._packages.clear();
    this._categories.clear();
  }

  private _rebuildCategories(): void {
    this._categories.clear();
    for (const pkg of this._packages.values()) {
      const category = pkg.category || 'uncategorized';
      const existing = this._categories.get(category) ?? [];
      existing.push(pkg);
      this._categories.set(category, existing);
    }
  }
}
