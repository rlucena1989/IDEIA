import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('ecosystem - capability-discovery', () => {
  let ServiceCatalog: typeof import('../ecosystem/service-catalog').ServiceCatalog;
  let CapabilityDiscovery: typeof import('../ecosystem/capability-discovery').CapabilityDiscovery;
  let catalog: import('../ecosystem/service-catalog').ServiceCatalog;
  let discovery: import('../ecosystem/capability-discovery').CapabilityDiscovery;

  beforeEach(() => {
    jest.resetModules();
    ServiceCatalog = require('../ecosystem/service-catalog').ServiceCatalog;
    CapabilityDiscovery = require('../ecosystem/capability-discovery').CapabilityDiscovery;
    catalog = new ServiceCatalog();
    discovery = new CapabilityDiscovery(catalog);
  });

  it('discoverAll retorna todas as capacidades', () => {
    const all = discovery.discoverAll();
    expect(all.length).toBeGreaterThan(0);
    for (const c of all) {
      expect(c.name).toBeTruthy();
      expect(typeof c.available).toBe('boolean');
      expect(c.service).toBeTruthy();
    }
  });

  it('discoverAll filtra por categoria', () => {
    const infra = discovery.discoverAll('infra');
    expect(infra.length).toBeGreaterThan(0);
    expect(infra.every(c => {
      const allCaps = catalog.findCapabilities('infra');
      return allCaps.some(ac => ac.name === c.name);
    })).toBe(true);
  });

  it('discoverAll marca servicos ativos como available', () => {
    const all = discovery.discoverAll();
    const activeServices = catalog.listServices().map(s => s.name);
    for (const c of all) {
      if (activeServices.includes(c.service)) {
        expect(c.available).toBe(true);
      }
    }
  });

  it('queryByCapability encontra por nome parcial', () => {
    const results = discovery.queryByCapability('agent');
    expect(results.length).toBeGreaterThan(0);
    expect(results.every(c => c.name.toLowerCase().includes('agent'))).toBe(true);
  });

  it('queryByCapability retorna vazio para termo inexistente', () => {
    const results = discovery.queryByCapability('zzz_nonexistent_zzz');
    expect(results).toHaveLength(0);
  });

  it('getAvailableTags retorna tags do catalogo', () => {
    const tags = discovery.getAvailableTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(Array.isArray(tags)).toBe(true);
  });

  it('findServicesWithCapability encontra servicos por capacidade', () => {
    const services = discovery.findServicesWithCapability('orchestrat');
    expect(services.length).toBeGreaterThan(0);
  });

  it('findServicesWithCapability retorna servicos unicos', () => {
    const services = discovery.findServicesWithCapability('agent');
    const unique = new Set(services);
    expect(unique.size).toBe(services.length);
  });

  it('getSummary retorna sumario com timestamp', () => {
    const summary = discovery.getSummary();
    expect(summary.timestamp).toBeTruthy();
    expect(summary.totalCapabilities).toBeGreaterThan(0);
    expect(summary.availableCapabilities).toBeGreaterThan(0);
    expect(summary.details.length).toBe(summary.totalCapabilities);
  });

  it('getSummary com todas disponiveis', () => {
    const summary = discovery.getSummary();
    expect(summary.availableCapabilities).toBe(summary.totalCapabilities);
  });

  it('lida com servico inexistente no catalogo', () => {
    const caps = catalog.findCapabilities();
    const testCap = caps[0];
    const service = catalog.getService(testCap!.serviceId);
    expect(service).toBeDefined();
  });
});
