import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('ecosystem - self-awareness', () => {
  let SelfAwareness: typeof import('../ecosystem/self-awareness').SelfAwareness;
  let awareness: import('../ecosystem/self-awareness').SelfAwareness;

  beforeEach(() => {
    jest.resetModules();
    SelfAwareness = require('../ecosystem/self-awareness').SelfAwareness;
    awareness = new SelfAwareness();
  });

  it('describeSystem retorna descricao completa', () => {
    const system = awareness.describeSystem();
    expect(system.name).toBe('IDEIA');
    expect(system.version).toBeTruthy();
    expect(system.description).toBeTruthy();
    expect(system.totalPackages).toBeGreaterThan(0);
    expect(system.totalCapabilities).toBeGreaterThan(0);
    expect(system.architecture.layers.length).toBe(10);
    expect(system.stack.languages.length).toBeGreaterThan(0);
    expect(system.workflows.length).toBeGreaterThan(0);
    expect(system.principles.length).toBeGreaterThan(0);
  });

  it('getCapabilities retorna todas as capacidades', () => {
    const caps = awareness.getCapabilities();
    expect(caps.length).toBeGreaterThan(0);
    for (const c of caps) {
      expect(c.name).toBeTruthy();
      expect(c.service).toBeTruthy();
      expect(c.category).toBeTruthy();
      expect(c.level).toBeTruthy();
    }
  });

  it('getCapabilities filtra por categoria', () => {
    const memoryCaps = awareness.getCapabilities('memory');
    if (memoryCaps.length > 0) {
      expect(memoryCaps.every(c => c.category === 'memory')).toBe(true);
    }
  });

  it('getArchitecture retorna arquitetura', () => {
    const arch = awareness.getArchitecture();
    expect(arch.layers).toHaveLength(10);
    expect(arch.layers[0].name).toBe('Shell');
    expect(arch.layers[9].name).toBe('Data');
  });

  it('getStack retorna stack', () => {
    const stack = awareness.getStack();
    expect(stack.languages).toContain('TypeScript');
    expect(stack.frameworks).toContain('React 18');
  });

  it('getWorkflows retorna todos os workflows', () => {
    const workflows = awareness.getWorkflows();
    expect(workflows.length).toBeGreaterThan(0);
    expect(workflows[0].name).toBeTruthy();
    expect(workflows[0].steps.length).toBeGreaterThan(0);
  });

  it('getWorkflows filtra por nome', () => {
    const filtered = awareness.getWorkflows('Bug');
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every(w => w.name.toLowerCase().includes('bug'))).toBe(true);
  });

  it('discoverAvailableCapabilities retorna lista com disponibilidade', () => {
    const caps = awareness.discoverAvailableCapabilities();
    expect(caps.length).toBeGreaterThan(0);
    for (const c of caps) {
      expect(typeof c.available).toBe('boolean');
      expect(c.service).toBeTruthy();
    }
  });

  it('formatAsMarkdown retorna string markdown', () => {
    const md = awareness.formatAsMarkdown();
    expect(typeof md).toBe('string');
    expect(md.length).toBeGreaterThan(0);
    expect(md).toContain('# IDEIA');
    expect(md).toContain('## Architecture');
    expect(md).toContain('## Technology Stack');
    expect(md).toContain('## Available Workflows');
    expect(md).toContain('## Guiding Principles');
  });

  it('formatAsMarkdown contem todas as secoes principais', () => {
    const md = awareness.formatAsMarkdown();
    expect(md).toContain('## Available Capabilities');
    expect(md).toContain('## All Packages');
  });
});
