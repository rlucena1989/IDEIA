jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { acceptanceTest } from '../acceptance-test';

describe('acceptanceTest', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 file entries', () => {
    acceptanceTest('login', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
  });

  it('generates Gherkin feature file', () => {
    acceptanceTest('checkout', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[0].path).toContain('{{name_kebab}}.feature');
    expect(files[0].content).toContain('Feature: {{Name}}');
  });

  it('generates Cucumber step definitions', () => {
    acceptanceTest('registration', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].path).toContain('{{name_kebab}}-steps.ts');
    expect(files[1].content).toContain('@cucumber/cucumber');
  });

  it('interpolates feature name in step definitions', () => {
    acceptanceTest('search', { dryRun: false, force: false });
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files[1].content).toContain('{{name}} action');
  });
});
