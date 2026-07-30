jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { workflow } from '../workflow';

describe('workflow', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 file entries', () => {
    workflow('Order', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
  });

  it('generates workflow class file', () => {
    workflow('Approval', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{Name}}Workflow.ts');
    expect(files[0].content).toContain('class {{Name}}Workflow');
  });

  it('generates test file', () => {
    workflow('Onboarding', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('__tests__');
    expect(files[1].path).toContain('Workflow.test.ts');
    expect(files[1].content).toContain('describe(');
  });

  it('uses name_kebab in base directory', () => {
    workflow('checkout-flow', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{name_kebab}}');
  });

  it('passes options to generateFiles', () => {
    workflow('Test', { dryRun: true, force: false });
    const [, , options] = (generateFiles as jest.Mock).mock.calls[0];
    expect(options.dryRun).toBe(true);
  });
});
