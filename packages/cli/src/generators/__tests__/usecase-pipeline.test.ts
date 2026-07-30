const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { usecasePipeline } from '../usecase-pipeline';

describe('usecase-pipeline generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates usecase pipeline files', () => {
    usecasePipeline('create-order', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(5);
    expect(files[0].path).toContain('{{Name}}Request.ts');
    expect(files[1].path).toContain('{{Name}}Response.ts');
    expect(files[2].path).toContain('{{Name}}Handler.ts');
    expect(files[3].path).toContain('index.ts');
    expect(files[4].path).toContain('{{Name}}Handler.test.ts');
  });

  it('builds vars from name', () => {
    usecasePipeline('refund', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('Refund');
    expect(vars.name_kebab).toBe('refund');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: false, force: false };
    usecasePipeline('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
