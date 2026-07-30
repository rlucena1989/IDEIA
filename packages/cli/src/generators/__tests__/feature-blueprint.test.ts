const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { featureBlueprint } from '../feature-blueprint';

describe('feature-blueprint generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates 1 markdown file', () => {
    featureBlueprint('user-auth', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('{{name_kebab}}/blueprint.md');
  });

  it('passes vars correctly', () => {
    featureBlueprint('search', { dryRun: true, force: false });
    const [, vars] = (generateFiles as jest.Mock).mock.calls[0];
    expect(vars.Name).toBe('Search');
    expect(vars.NAME).toBe('SEARCH');
  });
});
