import { describe, it, expect } from '@jest/globals';
import { grantAuthority } from '../authority-broker';
import { createDomain } from '../ecosystem-types';

describe('authority-broker', () => {
  it('grantAuthority should be defined', () => {
    expect(grantAuthority).toBeDefined();
  });

  it('should grant high authority for medium trust', () => {
    const d = createDomain({ name: 'Team', type: 'team', trustLevel: 'high' });
    const a = grantAuthority(d, 'admin', 'Delegated');
    expect(a.authorityLevel).toBe('high');
    expect(a.grantedBy).toBe('admin');
  });

  it('should grant critical authority for critical trust', () => {
    const d = createDomain({ name: 'Org', type: 'organization', trustLevel: 'critical' });
    const a = grantAuthority(d, 'root', 'Top level');
    expect(a.authorityLevel).toBe('critical');
  });
});
