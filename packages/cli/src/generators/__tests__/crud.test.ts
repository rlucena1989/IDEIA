jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { crud } from '../crud';

describe('crud', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('calls generateFiles with 13 file entries for basic entity', () => {
    crud('product', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(13);
    expect(files[0]).toHaveProperty('path');
    expect(files[0]).toHaveProperty('content');
  });

  it('contains domain entity file', () => {
    crud('user', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{Name}}Entity.ts');
  });

  it('contains repository interface', () => {
    crud('order', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('{{Name}}Repository.ts');
  });

  it('contains service class', () => {
    crud('invoice', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.map((f: { path: string }) => f.path).some((p: string) => p.includes('Service.ts'))).toBe(true);
  });

  it('contains controller with routes', () => {
    crud('task', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.map((f: { path: string }) => f.path).some((p: string) => p.includes('Controller.ts'))).toBe(true);
  });

  it('passes vars and options to generateFiles', () => {
    crud('test', { dryRun: true, force: false, cwd: '/tmp' });
    const [, vars, options] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name).toBe('test');
    expect(options.dryRun).toBe(true);
    expect(options.cwd).toBe('/tmp');
  });
});
