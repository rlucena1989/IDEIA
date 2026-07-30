jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { example } from '../example';

describe('example generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 files', () => {
    example('quickstart', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{name_kebab}}/README.md');
    expect(files[1].path).toContain('{{Name}}.ts');
  });

  it('passes vars correctly', () => {
    example('data-pipeline', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.Name).toBe('DataPipeline');
    expect(vars.name_kebab).toBe('data-pipeline');
  });
});
