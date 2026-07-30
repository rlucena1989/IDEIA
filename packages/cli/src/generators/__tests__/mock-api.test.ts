jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { mockApi } from '../mock-api';

describe('mock-api generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 files', () => {
    mockApi('users', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('mock.ts');
    expect(files[1].path).toContain('mock.test.ts');
  });

  it('passes vars correctly', () => {
    mockApi('products', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name).toBe('products');
    expect(vars.Name).toBe('Products');
  });
});
