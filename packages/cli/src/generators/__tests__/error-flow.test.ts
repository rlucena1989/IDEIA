jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { errorFlow } from '../error-flow';

describe('error-flow generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 4 files', () => {
    errorFlow('payment', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(4);
    expect(files[0].path).toContain('ErrorCodes.ts');
    expect(files[1].path).toContain('Exceptions.ts');
    expect(files[2].path).toContain('ErrorHandler.ts');
    expect(files[3].path).toContain('test');
  });

  it('passes vars correctly for kebab module name', () => {
    errorFlow('user-auth', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name_kebab).toBe('user-auth');
    expect(vars.Name).toBe('UserAuth');
  });
});
