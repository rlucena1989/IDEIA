const mockResult = { created: ['file1.ts'], skipped: [], overwritten: [], errors: [] };
jest.mock('../engine', () => {
  const actual = jest.requireActual('../engine');
  return { ...actual, generateFiles: jest.fn(() => mockResult) };
});

import { generateFiles } from '../engine';
import { runbook } from '../runbook';

describe('runbook generator', () => {
  beforeEach(() => { (generateFiles as jest.Mock).mockClear(); });

  it('generates runbook file', () => {
    runbook('database-outage', { dryRun: false, force: false });
    expect(generateFiles).toHaveBeenCalled();
    const files = (generateFiles as jest.Mock).mock.calls[0][0];
    expect(files.length).toBe(1);
    expect(files[0].path).toContain('{{name_kebab}}.md');
    expect(files[0].content).toContain('# Runbook:');
  });

  it('builds vars from scenario name', () => {
    runbook('pod-crashloop', { dryRun: false, force: false });
    const vars = (generateFiles as jest.Mock).mock.calls[0][1];
    expect(vars.Name).toBe('PodCrashloop');
    expect(vars.name_kebab).toBe('pod-crashloop');
  });

  it('passes options to generateFiles', () => {
    const opts = { dryRun: false, force: false };
    runbook('test', opts);
    expect((generateFiles as jest.Mock).mock.calls[0][2]).toEqual(opts);
  });
});
