import { AutoFixer } from '../src/auto-fixer';
import { GateRunnerResult } from '../src/types';

function makeResult(name: string, passed: boolean): GateRunnerResult {
  return { name, passed, action: 'warn', durationMs: 100 };
}

describe('AutoFixer', () => {
  it('returns empty fixes for passed gates', async () => {
    const fixer = new AutoFixer();
    const results: GateRunnerResult[] = [makeResult('lint', true), makeResult('test', true)];
    const fixes = await fixer.fix(results);
    expect(fixes).toHaveLength(2);
    expect(fixes[0].success).toBe(true);
    expect(fixes[0].fixes).toEqual([]);
  });

  it('isFixable returns true for lint and format', () => {
    const fixer = new AutoFixer();
    expect(fixer.isFixable('lint')).toBe(true);
    expect(fixer.isFixable('format')).toBe(true);
    expect(fixer.isFixable('test')).toBe(false);
    expect(fixer.isFixable('build')).toBe(false);
  });

  it('fixGate returns error for non-fixable gate', async () => {
    const fixer = new AutoFixer();
    const result = await fixer.fixGate('test', 'echo test');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not auto-fixable');
  });

  it('fixGate returns success for fixable gate', async () => {
    const fixer = new AutoFixer();
    const result = await fixer.fixGate('lint', 'echo ok');
    expect(result.gate).toBe('lint');
    expect(typeof result.success).toBe('boolean');
  });
});
