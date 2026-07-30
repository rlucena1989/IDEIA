const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { multiTenant } from '../multi-tenant';

describe('multi-tenant generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates tenant files', () => {
    multiTenant('billing', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('TenantAware.ts');
    expect(files[1].path).toContain('TenantIsolation.ts');
    expect(files[2].path).toContain('tenant-policy.md');
  });

  it('builds vars from entity name', () => {
    multiTenant('user-profile', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('UserProfile');
    expect(vars.NAME).toBe('USER_PROFILE');
    expect(vars.name_kebab).toBe('user-profile');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: true, force: true, cwd: '/tmp' };
    multiTenant('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
