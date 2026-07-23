import { describe, it, expect } from '@jest/globals';
import { ServiceCatalog } from '../service-catalog';

describe('service-catalog', () => {
  it('should initialize with predefined services', () => {
    const catalog = new ServiceCatalog();
    expect(catalog.getServiceCount()).toBeGreaterThan(0);
    expect(catalog.getCapabilityCount()).toBeGreaterThan(0);
  });

  it('should list all active services', () => {
    const catalog = new ServiceCatalog();
    const services = catalog.listServices();
    expect(services.length).toBeGreaterThan(0);
    services.forEach(s => expect(s.status).toBe('active'));
  });

  it('should find a service by name', () => {
    const catalog = new ServiceCatalog();
    const service = catalog.getService('agent-runtime');
    expect(service).toBeDefined();
    expect(service!.name).toBe('agent-runtime');
    expect(service!.capabilities.length).toBeGreaterThan(0);
  });

  it('should return undefined for unknown service', () => {
    const catalog = new ServiceCatalog();
    expect(catalog.getService('nonexistent')).toBeUndefined();
  });

  it('should filter services by type', () => {
    const catalog = new ServiceCatalog();
    const libs = catalog.listServices('library');
    libs.forEach(s => expect(s.type).toBe('library'));
  });

  it('should find capabilities by category', () => {
    const catalog = new ServiceCatalog();
    const security = catalog.findCapabilities('security');
    expect(security.length).toBeGreaterThan(0);
    security.forEach(c => expect(c.category).toBe('security'));
  });

  it('should return capabilities for a specific service', () => {
    const catalog = new ServiceCatalog();
    const caps = catalog.getCapabilitiesForService('cli');
    expect(caps.length).toBeGreaterThan(0);
    const allServices = catalog.listServices();
    caps.forEach(c => {
      const service = allServices.find(s => s.serviceId === c.serviceId);
      expect(service).toBeDefined();
      expect(service!.name).toBe('cli');
    });
  });

  it('should query services by tag', () => {
    const catalog = new ServiceCatalog();
    const services = catalog.queryByTag('security');
    expect(services.length).toBeGreaterThan(0);
    services.forEach(s => expect(s.tags).toContain('security'));
  });

  it('should return all unique tags', () => {
    const catalog = new ServiceCatalog();
    const tags = catalog.getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(new Set(tags).size).toBe(tags.length);
  });

  it('should register a new service dynamically', () => {
    const catalog = new ServiceCatalog();
    const count = catalog.getServiceCount();
    catalog.registerService({
      serviceId: 'test-id',
      name: 'test-service',
      type: 'library',
      description: 'Test service for unit testing',
      capabilities: ['test-capability'],
      dependencies: [],
      status: 'active',
      tags: ['test'],
    });
    expect(catalog.getServiceCount()).toBe(count + 1);
    expect(catalog.getService('test-service')).toBeDefined();
  });

  it('should export full catalog', () => {
    const catalog = new ServiceCatalog();
    const exported = catalog.exportCatalog();
    expect(exported.services.length).toBeGreaterThan(0);
    expect(exported.capabilities.length).toBeGreaterThan(0);
    expect(exported.tags.length).toBeGreaterThan(0);
  });
});
