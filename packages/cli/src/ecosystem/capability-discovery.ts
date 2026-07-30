import { ServiceCatalog } from './service-catalog';
import { createLogger } from '@ideia/logger';
const logger = createLogger('capability-discovery');

export interface DiscoveredCapability {
  name: string;
  available: boolean;
  service: string;
  reason?: string;
}

export interface DiscoveryResult {
  timestamp: string;
  totalCapabilities: number;
  availableCapabilities: number;
  details: DiscoveredCapability[];
}

export class CapabilityDiscovery {
  private catalog: ServiceCatalog;

  constructor(catalog: ServiceCatalog) {
    this.catalog = catalog;
  }

  discoverAll(category?: string): DiscoveredCapability[] {
    const capabilities = category
      ? this.catalog.findCapabilities(category as 'orchestration' | 'intelligence' | 'memory' | 'execution' | 'security' | 'integration' | 'ux' | 'infra' | 'data')
      : this.catalog.findCapabilities();

    return capabilities.map(cap => {
      const service = this.catalog.getService(cap.serviceId);
      if (!service) {
        return { name: cap.name, available: false, service: 'unknown', reason: 'Service not found' };
      }
      return { name: cap.name, available: service.status === 'active', service: service.name, reason: service.status !== 'active' ? `Service status: ${service.status}` : undefined };
    });
  }

  queryByCapability(capabilityName: string): DiscoveredCapability[] {
    const all = this.discoverAll();
    return all.filter(c => c.name.toLowerCase().includes(capabilityName.toLowerCase()));
  }

  getAvailableTags(): string[] {
    return this.catalog.getAllTags();
  }

  findServicesWithCapability(capabilityName: string): string[] {
    return this.catalog.findCapabilities()
      .filter(c => c.name.toLowerCase().includes(capabilityName.toLowerCase()))
      .map(c => this.catalog.getService(c.serviceId)?.name ?? 'unknown')
      .filter((v, i, a) => a.indexOf(v) === i);
  }

  getSummary(): DiscoveryResult {
    const all = this.discoverAll();
    const available = all.filter(c => c.available);
    return {
      timestamp: new Date().toISOString(),
      totalCapabilities: all.length,
      availableCapabilities: available.length,
      details: all,
    };
  }
}
