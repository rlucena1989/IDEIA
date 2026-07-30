jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn().mockReturnValue({ created: [], skipped: [], overwritten: [], errors: [] }) };
});

import { generateFiles } from '../engine';
import { configValidator } from '../config-validator';

describe('config-validator generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 files', () => {
    configValidator('app', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{Name}}Config.ts');
    expect(files[1].path).toContain('{{Name}}Config.test.ts');
  });

  it('passes vars with correct transformations', () => {
    configValidator('my-app', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.Name).toBe('MyApp');
    expect(vars.NAME).toBe('MY_APP');
    expect(vars.name_kebab).toBe('my-app');
  });
});
