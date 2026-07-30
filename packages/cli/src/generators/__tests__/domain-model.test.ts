jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { domainModel } from '../domain-model';

describe('domainModel', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 3 file entries', () => {
    domainModel('Customer', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
  });

  it('generates domain class file', () => {
    domainModel('Invoice', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{Name}}.ts');
    expect(files[0].path).toContain('domain');
    expect(files[0].content).toContain('class {{Name}}');
  });

  it('generates test file', () => {
    domainModel('Order', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('__tests__');
    expect(files[1].path).toContain('.test.ts');
    expect(files[1].content).toContain('describe(');
  });

  it('generates validator file', () => {
    domainModel('Product', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[2].path).toContain('{{Name}}Validator.ts');
    expect(files[2].content).toContain('validate{{Name}}');
  });

  it('passes vars and options correctly', () => {
    domainModel('Test', { dryRun: true, force: true, cwd: '/tmp' });
    const [, vars, options] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name).toBe('Test');
    expect(options.dryRun).toBe(true);
    expect(options.force).toBe(true);
  });
});
