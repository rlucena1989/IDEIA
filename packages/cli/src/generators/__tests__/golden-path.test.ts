const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { goldenPath } from '../golden-path';

describe('golden-path generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 2 files', () => {
    goldenPath('node-api', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('{{name_kebab}}-golden-path.ts');
    expect(files[1].path).toContain('{{name_kebab}}-golden-path.md');
  });

  it('passes vars correctly', () => {
    goldenPath('react-app', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.name_kebab).toBe('react-app');
    expect(vars.Name).toBe('ReactApp');
  });
});
