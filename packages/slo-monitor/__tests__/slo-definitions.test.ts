import { describe, it, expect } from '@jest/globals';
import { DEFAULT_SLO_DEFINITIONS, createSloDefinitionLoader } from '../src/slo-definitions';

describe('SloDefinitionLoader', () => {
  it('can be constructed with default definitions', () => {
    const loader = createSloDefinitionLoader();
    expect(loader).toBeDefined();
  });

  it('get returns a definition by contract ID', () => {
    const loader = createSloDefinitionLoader();
    const def = loader.get('C1');
    expect(def).toBeDefined();
    expect(def!.contract).toBe('C1');
    expect(def!.description).toBe('Command Dispatch Latency');
  });

  it('get returns undefined for unknown contract', () => {
    const loader = createSloDefinitionLoader();
    expect(loader.get('ZZZ')).toBeUndefined();
  });

  it('getAll returns all definitions', () => {
    const loader = createSloDefinitionLoader();
    const all = loader.getAll();
    expect(all.length).toBe(DEFAULT_SLO_DEFINITIONS.length);
  });

  it('getBySeverity filters correctly', () => {
    const loader = createSloDefinitionLoader();
    const critical = loader.getBySeverity('critical');
    expect(critical.length).toBeGreaterThan(0);
    expect(critical.every(d => d.severity === 'critical')).toBe(true);
  });

  it('getByTag filters correctly', () => {
    const loader = createSloDefinitionLoader();
    const core = loader.getByTag('core');
    expect(core.length).toBeGreaterThan(0);
    expect(core.every(d => d.tags?.includes('core'))).toBe(true);
  });

  it('loadFromJson parses JSON definitions', () => {
    const loader = createSloDefinitionLoader([]);
    const json = JSON.stringify({
      version: '1.0.0',
      generatedAt: '2026-01-01T00:00:00.000Z',
      contracts: [
        {
          contract: 'X1', description: 'Test Contract',
          thresholds: { latencyP50Max: 100, latencyP95Max: 200, latencyP99Max: 400, availabilityMin: 99, throughputMin: 100, errorRateMax: 1 },
          severity: 'high',
        },
      ],
    });
    const parsed = loader.loadFromJson(json);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.contracts.length).toBe(1);
    const def = loader.get('X1');
    expect(def).toBeDefined();
    expect(def!.contract).toBe('X1');
  });

  it('toJson produces valid JSON', () => {
    const loader = createSloDefinitionLoader();
    const json = loader.toJson();
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0.0');
    expect(Array.isArray(parsed.contracts)).toBe(true);
  });
});
