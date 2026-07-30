const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { testMatrix } from '../test-matrix';

describe('test-matrix generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates test matrix file', () => {
    testMatrix('checkout', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('{{name_kebab}}-matrix.md');
    expect(files[0].content).toContain('# Test Matrix:');
  });

  it('builds vars from module name', () => {
    testMatrix('user-auth', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('UserAuth');
    expect(vars.name_kebab).toBe('user-auth');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: true, force: false };
    testMatrix('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
