const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { uxContract } from '../ux-contract';

describe('ux-contract generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates UX contract file', () => {
    uxContract('search', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('{{name_kebab}}.yaml');
    expect(files[0].content).toContain('# UX Contract:');
  });

  it('builds vars from feature name', () => {
    uxContract('file-upload', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('FileUpload');
    expect(vars.name_kebab).toBe('file-upload');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: true, force: true };
    uxContract('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
