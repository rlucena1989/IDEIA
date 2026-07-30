import { routeEcosystemSync } from '../ecosystem-router';
import { DomainNode } from '../ecosystem-types';

function makeDomain(id: string, overrides: Partial<DomainNode> = {}): DomainNode {
  return {
    domainId: id,
    name: id,
    type: 'team',
    trustLevel: 'medium',
    status: 'healthy',
    scope: [],
    owners: [],
    policies: [],
    ...overrides,
  };
}

describe('ecosystem-router', () => {
  test('routes to a matching healthy domain', () => {
    const from = makeDomain('origin');
    const targets = [
      makeDomain('target-a', { scope: ['data'] }),
    ];
    const result = routeEcosystemSync(from, targets, 'data');
    expect(result).toBeDefined();
    expect(result!.domainId).toBe('target-a');
  });

  test('returns undefined when no domain has the scope', () => {
    const from = makeDomain('origin');
    const targets = [
      makeDomain('target-a', { scope: ['other'] }),
    ];
    const result = routeEcosystemSync(from, targets, 'data');
    expect(result).toBeUndefined();
  });

  test('skips the origin domain', () => {
    const from = makeDomain('origin', { scope: ['data'] });
    const targets = [
      makeDomain('origin', { scope: ['data'] }),
      makeDomain('target', { scope: ['data'] }),
    ];
    const result = routeEcosystemSync(from, targets, 'data');
    expect(result).toBeDefined();
    expect(result!.domainId).toBe('target');
  });

  test('skips non-healthy domains', () => {
    const from = makeDomain('origin');
    const targets = [
      makeDomain('blocked', { status: 'blocked', scope: ['data'] }),
      makeDomain('healthy', { scope: ['data'] }),
    ];
    const result = routeEcosystemSync(from, targets, 'data');
    expect(result).toBeDefined();
    expect(result!.domainId).toBe('healthy');
  });

  test('returns first match if multiple', () => {
    const from = makeDomain('origin');
    const targets = [
      makeDomain('first', { scope: ['data'] }),
      makeDomain('second', { scope: ['data'] }),
    ];
    const result = routeEcosystemSync(from, targets, 'data');
    expect(result).toBeDefined();
  });

  test('returns undefined for empty domain list', () => {
    const from = makeDomain('origin');
    const result = routeEcosystemSync(from, [], 'data');
    expect(result).toBeUndefined();
  });
});
