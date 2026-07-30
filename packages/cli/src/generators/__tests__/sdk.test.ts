const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { sdk } from '../sdk';

describe('sdk generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates SDK files', () => {
    sdk('payment-api', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('{{Name}}Client.ts');
    expect(files[1].path).toContain('package.json');
    expect(files[2].path).toContain('index.ts');
  });

  it('builds vars from module name', () => {
    sdk('notification', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('Notification');
    expect(vars.name_kebab).toBe('notification');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: true, force: false };
    sdk('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
