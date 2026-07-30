import { describe, it, expect, beforeEach } from '@jest/globals';

describe('ecosystem - service-catalog', () => {
  let ServiceCatalog: typeof import('../ecosystem/service-catalog').ServiceCatalog;
  let catalog: import('../ecosystem/service-catalog').ServiceCatalog;

  beforeEach(() => {
    jest.resetModules();
    ServiceCatalog = require('../ecosystem/service-catalog').ServiceCatalog;
    catalog = new ServiceCatalog();
  });

  it('listServices retorna servicos ativos', () => {
    const services = catalog.listServices();
    expect(services.length).toBeGreaterThan(0);
    for (const s of services) {
      expect(s.status).toBe('active');
    }
  });

  it('listServices filtra por tipo', () => {
    const cliServices = catalog.listServices('cli');
    expect(cliServices.length).toBeGreaterThan(0);
    expect(cliServices.every(s => s.type === 'cli')).toBe(true);
  });

  it('listServices filtra library', () => {
    const libs = catalog.listServices('library');
    expect(libs.length).toBeGreaterThan(0);
    expect(libs.every(s => s.type === 'library')).toBe(true);
  });

  it('getService encontra por nome', () => {
    const cli = catalog.getService('cli');
    expect(cli).toBeDefined();
    expect(cli!.name).toBe('cli');
    expect(cli!.type).toBe('cli');
  });

  it('getService encontra por id', () => {
    const services = catalog.listServices();
    const first = services[0];
    const found = catalog.getService(first!.serviceId);
    expect(found).toBeDefined();
    expect(found!.serviceId).toBe(first!.serviceId);
  });

  it('getService retorna undefined para nome inexistente', () => {
    expect(catalog.getService('nonexistent-service')).toBeUndefined();
  });

  it('findCapabilities retorna todas as capacidades', () => {
    const caps = catalog.findCapabilities();
    expect(caps.length).toBeGreaterThan(0);
    for (const c of caps) {
      expect(c.capabilityId).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.serviceId).toBeTruthy();
    }
  });

  it('findCapabilities filtra por categoria', () => {
    const securityCaps = catalog.findCapabilities('security');
    expect(securityCaps.length).toBeGreaterThan(0);
    expect(securityCaps.every(c => c.category === 'security')).toBe(true);
  });

  it('queryByTag retorna servicos com a tag', () => {
    const security = catalog.queryByTag('security');
    expect(security.length).toBeGreaterThan(0);
    expect(security.every(s => s.tags.includes('security'))).toBe(true);
  });

  it('getCapabilitiesForService retorna capacidades de um servico', () => {
    const caps = catalog.getCapabilitiesForService('cli');
    expect(caps.length).toBeGreaterThan(0);
    const service = catalog.getService('cli');
    expect(caps.every(c => c.serviceId === service!.serviceId)).toBe(true);
  });

  it('getCapabilitiesForService retorna vazio para servico inexistente', () => {
    expect(catalog.getCapabilitiesForService('nonexistent')).toEqual([]);
  });

  it('getAllTags retorna tags ordenadas', () => {
    const tags = catalog.getAllTags();
    expect(tags.length).toBeGreaterThan(0);
    expect(tags).toEqual([...tags].sort());
  });

  it('getServiceCount retorna numero de servicos ativos', () => {
    expect(catalog.getServiceCount()).toBeGreaterThan(0);
  });

  it('getCapabilityCount retorna numero de capacidades', () => {
    expect(catalog.getCapabilityCount()).toBeGreaterThan(0);
  });

  it('registerService adiciona novo servico', () => {
    const before = catalog.getServiceCount();
    catalog.registerService({
      serviceId: 'new-id', name: 'test-service', type: 'library',
      description: 'Test', capabilities: ['test-cap'], dependencies: [],
      status: 'active', tags: ['test'],
    });
    expect(catalog.getServiceCount()).toBe(before + 1);
    expect(catalog.getService('test-service')).toBeDefined();
  });

  it('registerService atualiza servico existente', () => {
    catalog.registerService({
      serviceId: 'updated-id', name: 'cli', type: 'library',
      description: 'Updated description', capabilities: ['new-cap'],
      dependencies: [], status: 'active', tags: ['updated'],
    });
    const updated = catalog.getService('cli');
    expect(updated!.description).toBe('Updated description');
  });

  it('exportCatalog retorna estrutura completa', () => {
    const exported = catalog.exportCatalog();
    expect(exported.services.length).toBeGreaterThan(0);
    expect(exported.capabilities.length).toBeGreaterThan(0);
    expect(exported.tags.length).toBeGreaterThan(0);
    expect(exported.services.every(s => s.status === 'active')).toBe(true);
  });

  it('categorizacao infere categoria correta para orchestration', () => {
    const caps = catalog.findCapabilities('orchestration');
    if (caps.length > 0) {
      expect(caps.every(c => c.category === 'orchestration')).toBe(true);
    }
  });

  it('categorizacao infere categoria intelligence', () => {
    const caps = catalog.findCapabilities('intelligence');
    expect(caps.length).toBeGreaterThan(0);
  });

  it('todos os servicos tem id unico', () => {
    const services = catalog.listServices();
    const ids = services.map(s => s.serviceId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
