const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { privacy } from '../privacy';

describe('privacy generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates privacy files', () => {
    privacy('user-data', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('lgpd-checklist.md');
    expect(files[1].path).toContain('PrivacyService.ts');
  });

  it('builds vars from feature name', () => {
    privacy('customer-portal', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('CustomerPortal');
    expect(vars.name_kebab).toBe('customer-portal');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: true, force: false };
    privacy('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
