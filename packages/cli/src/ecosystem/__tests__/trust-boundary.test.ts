import { canCrossTrustBoundary } from '../trust-boundary';
import { DomainNode } from '../ecosystem-types';

function makeDomain(overrides: Partial<DomainNode> = {}): DomainNode {
  return {
    domainId: 'test-id',
    name: 'test',
    type: 'team',
    trustLevel: 'medium',
    status: 'healthy',
    scope: [],
    owners: [],
    policies: [],
    ...overrides,
  };
}

describe('trust-boundary', () => {
  test('blocks low->critical trust crossing', () => {
    const from = makeDomain({ trustLevel: 'low' });
    const to = makeDomain({ trustLevel: 'critical' });
    expect(canCrossTrustBoundary(from, to, 'data')).toBe(false);
  });

  test('blocks secret payload type', () => {
    const from = makeDomain({ trustLevel: 'high' });
    const to = makeDomain({ trustLevel: 'high' });
    expect(canCrossTrustBoundary(from, to, 'secret')).toBe(false);
  });

  test('allows policy payload to non-blocked', () => {
    const from = makeDomain({ trustLevel: 'medium' });
    const to = makeDomain({ trustLevel: 'high', status: 'healthy' });
    expect(canCrossTrustBoundary(from, to, 'policy')).toBe(true);
  });

  test('allows policy payload to degraded', () => {
    const from = makeDomain({ trustLevel: 'medium' });
    const to = makeDomain({ trustLevel: 'high', status: 'degraded' });
    expect(canCrossTrustBoundary(from, to, 'policy')).toBe(true);
  });

  test('blocks policy payload to blocked', () => {
    const from = makeDomain({ trustLevel: 'medium' });
    const to = makeDomain({ trustLevel: 'high', status: 'blocked' });
    expect(canCrossTrustBoundary(from, to, 'policy')).toBe(false);
  });

  test('allows same trust level healthy to healthy', () => {
    const from = makeDomain({ trustLevel: 'medium', status: 'healthy' });
    const to = makeDomain({ trustLevel: 'medium', status: 'healthy' });
    expect(canCrossTrustBoundary(from, to, 'data')).toBe(true);
  });

  test('blocks when from is not healthy', () => {
    const from = makeDomain({ trustLevel: 'medium', status: 'blocked' });
    const to = makeDomain({ trustLevel: 'medium', status: 'healthy' });
    expect(canCrossTrustBoundary(from, to, 'data')).toBe(false);
  });

  test('blocks when to is not healthy', () => {
    const from = makeDomain({ trustLevel: 'medium', status: 'healthy' });
    const to = makeDomain({ trustLevel: 'medium', status: 'offline' });
    expect(canCrossTrustBoundary(from, to, 'data')).toBe(false);
  });

  test('allows critical->critical data crossing', () => {
    const from = makeDomain({ trustLevel: 'critical', status: 'healthy' });
    const to = makeDomain({ trustLevel: 'critical', status: 'healthy' });
    expect(canCrossTrustBoundary(from, to, 'data')).toBe(true);
  });
});
