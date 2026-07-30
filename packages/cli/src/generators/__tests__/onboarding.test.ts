const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { onboarding } from '../onboarding';

describe('onboarding generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates onboarding files', () => {
    onboarding({ dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(2);
    expect(files[0].path).toContain('onboarding-checklist.md');
    expect(files[1].path).toContain('CONTRIBUTING.md');
  });

  it('passes empty vars since onboarding has no name param', () => {
    onboarding({ dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars).toEqual({});
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: true, force: false };
    onboarding(opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
