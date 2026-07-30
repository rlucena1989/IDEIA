const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { observability } from '../observability';

describe('observability generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates observability files', () => {
    observability('payment', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('{{Name}}Metrics.ts');
    expect(files[1].path).toContain('{{Name}}Logger.ts');
    expect(files[2].path).toContain('{{Name}}Tracer.ts');
  });

  it('builds vars from module name', () => {
    observability('order-service', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('OrderService');
    expect(vars.name_kebab).toBe('order-service');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: true, force: false };
    observability('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
