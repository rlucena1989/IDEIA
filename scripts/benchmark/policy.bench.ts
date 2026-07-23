import { Bench } from 'tinybench';
import path from 'path';

export function policyBench(bench: Bench) {
  bench
    .add('classify safe command', () => {
      const cmd = 'ls -la /workspace';
      const blocked = [/^rm\s+-rf\s+\/$/, /^dd\s+/, /^format\s+/];
      for (const p of blocked) if (p.test(cmd)) return 'blocked';
      return 'safe';
    })
    .add('classify blocked command', () => {
      const cmd = 'rm -rf /';
      const blocked = [/^rm\s+-rf\s+\/$/, /^dd\s+/, /^format\s+/];
      for (const p of blocked) if (p.test(cmd)) return 'blocked';
      return 'safe';
    })
    .add('100 policy evaluations', () => {
      const commands = ['ls', 'rm -rf /', 'dd if=/dev/zero', 'git push', 'npm install', 'cat /etc/passwd'];
      const blocked = [/^rm\s+-rf\s+\/$/, /^dd\s+/, /^format\s+/];
      for (let i = 0; i < 100; i++) {
        const cmd = commands[i % commands.length];
        for (const p of blocked) if (p.test(cmd)) return 'blocked';
      }
      return 'safe';
    });
}
