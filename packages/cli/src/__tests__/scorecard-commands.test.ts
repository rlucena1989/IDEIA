import { spawnSync } from 'node:child_process';
import path from 'node:path';

const CLI = path.join(process.cwd(), 'packages/cli/dist/index.js');

function run(cmd: string, timeout = 30000): number {
  try {
    const r = spawnSync('node', [CLI, cmd, '--help'], { encoding: 'utf-8', timeout, stdio: 'pipe' });
    if (r.error) return 1;
    if (r.signal) return 1;
    return r.status ?? 1;
  } catch { return 1; }
}

describe('CLI commands --help', () => {
  const commands = ['status', 'doctor', 'verify', 'scorecard', 'optimize', 'audit', 'gate', 'prove', 'generate', 'context'];
  commands.forEach(cmd => {
    it(`${cmd} returns 0 with usage`, () => {
      const code = run(cmd);
      expect(code).toBe(0);
    });
  });
});
