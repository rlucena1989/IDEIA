import { MCPServerRegistry } from './mcp-server-registry';
import { createLogger } from '@ideia/logger';
import { MCPClientManager } from './mcp-client-manager';
import { ToolDiscoveryService } from './tool-discovery-service';
import { PermissionManager } from './permission-manager';
import { OfflineInstaller } from './offline-installer';
import { MarketplaceCatalog } from './marketplace-catalog';
import { PluginRatingEngine } from './plugin-rating-engine';
import { MarketplacePackage, MCPServerDefinition, PluginRating } from './types';
const logger = createLogger('mcp-marketplace');

export class MCPMarketplace {
  private _serverRegistry: MCPServerRegistry;
  private _clientManager: MCPClientManager;
  private _discoveryService: ToolDiscoveryService;
  private _permissionManager: PermissionManager;
  private _offlineInstaller: OfflineInstaller;
  private _catalog: MarketplaceCatalog;
  private _ratingEngine: PluginRatingEngine;

  constructor() {
    this._serverRegistry = new MCPServerRegistry();
    this._clientManager = new MCPClientManager();
    this._discoveryService = new ToolDiscoveryService(this._serverRegistry);
    this._permissionManager = new PermissionManager();
    this._offlineInstaller = new OfflineInstaller();
    this._catalog = new MarketplaceCatalog();
    this._ratingEngine = new PluginRatingEngine();
  }

  get serverRegistry(): MCPServerRegistry { return this._serverRegistry; }
  get clientManager(): MCPClientManager { return this._clientManager; }
  get discoveryService(): ToolDiscoveryService { return this._discoveryService; }
  get permissionManager(): PermissionManager { return this._permissionManager; }
  get offlineInstaller(): OfflineInstaller { return this._offlineInstaller; }
  get catalog(): MarketplaceCatalog { return this._catalog; }
  get ratingEngine(): PluginRatingEngine { return this._ratingEngine; }

  async installPackage(pkg: MarketplacePackage): Promise<{ success: boolean; errors: string[] }> {
    this._catalog.addPackage(pkg);
    const server: MCPServerDefinition = {
      id: pkg.id,
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      tools: pkg.tools,
      permissions: pkg.permissions,
      source: pkg.source,
      verified: pkg.verified,
      downloads: pkg.downloads,
      rating: pkg.rating,
      tags: pkg.tags,
    };
    this._serverRegistry.register(server);
    return { success: true, errors: [] };
  }

  async uninstallPackage(name: string): Promise<boolean> {
    const removed = this._catalog.removePackage(name);
    this._serverRegistry.unregister(name);
    return removed;
  }

  async searchTools(query: string): Promise<MarketplacePackage[]> {
    return this._catalog.search(query);
  }

  async getRating(packageName: string): Promise<PluginRating | undefined> {
    const pkg = this._catalog.getPackage(packageName);
    if (!pkg) return undefined;
    return this._ratingEngine.scorePackage(pkg);
  }

  async getStats(): Promise<{
    totalPackages: number;
    totalTools: number;
    installedCount: number;
    averageRating: number;
  }> {
    const packages = this._catalog.listPackages();
    const totalTools = packages.reduce((s, p) => s + p.tools.length, 0);
    const ratings = packages.map(p => this._ratingEngine.getAverageRating(p.name));
    const avgRating = ratings.length > 0 ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0;
    return {
      totalPackages: packages.length,
      totalTools,
      installedCount: this._offlineInstaller.listInstalled().length,
      averageRating: avgRating,
    };
  }
}
