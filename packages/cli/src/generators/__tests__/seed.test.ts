const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { seed } from '../seed';

describe('seed generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates seed files', () => {
    seed('product', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{name_kebab}}.seed.ts');
    expect(files[1].path).toContain('prisma/seed.ts');
  });

  it('builds vars from entity name', () => {
    seed('user-account', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('UserAccount');
    expect(vars.NAME).toBe('USER_ACCOUNT');
    expect(vars.name_kebab).toBe('user-account');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: false, force: true };
    seed('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
