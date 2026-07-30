const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { permissionEndpoint } from '../permission-endpoint';

describe('permission-endpoint generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates permission endpoint files', () => {
    permissionEndpoint('invoice', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{Name}}Controller.ts');
    expect(files[1].path).toContain('{{Name}}Controller.test.ts');
  });

  it('builds vars from resource name', () => {
    permissionEndpoint('api-key', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('ApiKey');
    expect(vars.name_kebab).toBe('api-key');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: false, force: true };
    permissionEndpoint('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
