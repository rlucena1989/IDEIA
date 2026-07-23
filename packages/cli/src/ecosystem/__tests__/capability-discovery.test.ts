import { describe, it, expect } from '@jest/globals';
import { ServiceCatalog } from '../service-catalog';
import { CapabilityDiscovery } from '../capability-discovery';

describe('capability-discovery', () => {
  const discovery = new CapabilityDiscovery(new ServiceCatalog());

  it('should discover all capabilities', () => {
    const all = discovery.discoverAll();
    expect(all.length).toBeGreaterThan(0);
    all.forEach(c => {
      expect(c.name).toBeDefined();
      expect(c.available).toBeDefined();
      expect(c.service).toBeDefined();
    });
  });

  it('should filter by category', () => {
    const security = discovery.discoverAll('security');
    security.forEach(c => {
      expect(c.service).toBeDefined();
    });
  });

  it('should query by capability name', () => {
    const results = discovery.queryByCapability('deploy');
    expect(results.length).toBeGreaterThan(0);
    results.forEach(r => expect(r.name.toLowerCase()).toContain('deploy'));
  });

  it('should find services with a capability', () => {
    const services = discovery.findServicesWithCapability('deploy');
    expect(services.length).toBeGreaterThan(0);
  });

  it('should return available tags', () => {
    const tags = discovery.getAvailableTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(tags).toContain('security');
    expect(tags).toContain('agent');
  });

  it('should return a summary', () => {
    const summary = discovery.getSummary();
    expect(summary.timestamp).toBeDefined();
    expect(summary.totalCapabilities).toBeGreaterThan(0);
    expect(summary.availableCapabilities).toBeGreaterThan(0);
    expect(summary.details.length).toBe(summary.totalCapabilities);
  });
});
