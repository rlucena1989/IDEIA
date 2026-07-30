jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { backgroundJob } from '../background-job';

describe('background-job generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 3 files', () => {
    backgroundJob('test', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(3);
    expect(files[0].path).toContain('Job.ts');
    expect(files[1].path).toContain('Queue.ts');
    expect(files[2].path).toContain('test');
  });

  it('passes vars and options', () => {
    backgroundJob('email', { dryRun: true, force: false });
    const [, vars, options] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name).toBe('email');
    expect(options.dryRun).toBe(true);
  });
});
