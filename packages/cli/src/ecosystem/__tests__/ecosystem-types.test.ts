import { createDomain } from '../ecosystem-types';

describe('ecosystem-types', () => {
  test('createDomain returns a DomainNode with required fields', () => {
    const domain = createDomain({ name: 'test-team', type: 'team' });
    expect(domain.name).toBe('test-team');
    expect(domain.type).toBe('team');
    expect(domain.domainId).toBeDefined();
    expect(domain.domainId.length).toBeGreaterThan(0);
  });

  test('createDomain sets default trust level to medium', () => {
    const domain = createDomain({ name: 'test', type: 'workspace' });
    expect(domain.trustLevel).toBe('medium');
  });

  test('createDomain overrides trust level', () => {
    const domain = createDomain({ name: 'test', type: 'organization', trustLevel: 'critical' });
    expect(domain.trustLevel).toBe('critical');
  });

  test('createDomain sets default status to healthy', () => {
    const domain = createDomain({ name: 'test', type: 'partner' });
    expect(domain.status).toBe('healthy');
  });

  test('createDomain overrides status', () => {
    const domain = createDomain({ name: 'test', type: 'team', status: 'blocked' });
    expect(domain.status).toBe('blocked');
  });

  test('createDomain sets defaults for scope, owners, policies', () => {
    const domain = createDomain({ name: 'test', type: 'authority' });
    expect(domain.scope).toEqual([]);
    expect(domain.owners).toEqual([]);
    expect(domain.policies).toEqual([]);
  });

  test('createDomain accepts custom arrays', () => {
    const domain = createDomain({
      name: 'test',
      type: 'team',
      scope: ['read', 'write'],
      owners: ['user1'],
      policies: ['policy-a'],
    });
    expect(domain.scope).toEqual(['read', 'write']);
    expect(domain.owners).toEqual(['user1']);
    expect(domain.policies).toEqual(['policy-a']);
  });

  test('createDomain generates unique IDs', () => {
    const d1 = createDomain({ name: 'a', type: 'team' });
    const d2 = createDomain({ name: 'b', type: 'team' });
    expect(d1.domainId).not.toBe(d2.domainId);
  });

  test('createDomain supports all types', () => {
    const types = ['team', 'workspace', 'organization', 'partner', 'authority'] as const;
    for (const type of types) {
      const domain = createDomain({ name: type, type });
      expect(domain.type).toBe(type);
    }
  });
});
