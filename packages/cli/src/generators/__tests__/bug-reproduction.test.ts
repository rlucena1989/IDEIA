jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { bugReproduction } from '../bug-reproduction';

describe('bug-reproduction generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 files', () => {
    bugReproduction('001', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{NAME}}-reproduction.md');
    expect(files[1].path).toContain('{{NAME}}-test.ts');
  });

  it('passes vars and options', () => {
    bugReproduction('002', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name).toBe('002');
    expect(vars.NAME).toBe('002');
  });
});
