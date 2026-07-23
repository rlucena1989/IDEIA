import { describe, it, expect } from '@jest/globals';
import { DomainRegistry } from '../domain-registry';
import { createDomain } from '../ecosystem-types';

describe('domain-registry', () => {
  it('should upsert and list domains', () => {
    const r = new DomainRegistry();
    r.upsert(createDomain({ name: 'Team A', type: 'team' }));
    expect(r.list().length).toBe(1);
  });

  it('should update on re-upsert', () => {
    const r = new DomainRegistry();
    const d = createDomain({ name: 'Old', type: 'team' });
    r.upsert(d);
    r.upsert({ ...d, name: 'New' });
    expect(r.get(d.domainId)?.name).toBe('New');
  });

  it('should remove a domain', () => {
    const r = new DomainRegistry();
    const d = createDomain({ name: 'X', type: 'organization' });
    r.upsert(d);
    r.remove(d.domainId);
    expect(r.count()).toBe(0);
  });
});
