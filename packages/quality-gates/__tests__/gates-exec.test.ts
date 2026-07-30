import { LintGate } from '../src/gates/lint';
import { TypecheckGate } from '../src/gates/typecheck';
import { TestGate } from '../src/gates/test';
import { CoverageGate } from '../src/gates/coverage';
import { BuildGate } from '../src/gates/build';
import * as path from 'path';

const testDir = path.resolve(__dirname, '..');

describe('Gate executors', () => {
  it('LintGate runs and returns result', async () => {
    const gate = new LintGate();
    const result = await gate.run(testDir, 'echo "no errors"', 'warn');
    expect(result.name).toBe('lint');
    expect(typeof result.passed).toBe('boolean');
    expect(typeof result.durationMs).toBe('number');
  });

  it('TypecheckGate runs and returns result', async () => {
    const gate = new TypecheckGate();
    const result = await gate.run(testDir, 'echo "typecheck ok"', 'block');
    expect(result.name).toBe('typecheck');
    expect(typeof result.passed).toBe('boolean');
  });

  it('TestGate runs and returns result', async () => {
    const gate = new TestGate();
    const result = await gate.run(testDir, 'echo "1 passed, 0 failed"', 'block');
    expect(result.name).toBe('test');
    expect(typeof result.passed).toBe('boolean');
  });

  it('CoverageGate extracts coverage from output', async () => {
    const gate = new CoverageGate();
    const result = await gate.run(testDir, 'echo "Lines: 85.5%"', 'warn', 80);
    expect(result.name).toBe('coverage');
    expect(result.coverage).toBe(85.5);
    expect(result.passed).toBe(true);
  });

  it('BuildGate returns passed on success', async () => {
    const gate = new BuildGate();
    const result = await gate.run(testDir, 'echo "build success"', 'block');
    expect(result.name).toBe('build');
    expect(result.passed).toBe(true);
  });

  it('BuildGate returns failed on error', async () => {
    const gate = new BuildGate();
    const result = await gate.run(testDir, 'exit 1', 'block');
    expect(result.name).toBe('build');
    expect(result.passed).toBe(false);
  });
});
