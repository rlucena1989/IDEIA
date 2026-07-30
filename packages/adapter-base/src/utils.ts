import { execSync } from 'node:child_process';
import { createLogger } from '@ideia/logger';
import type { CommandResult } from './types';
const logger = createLogger('utils');

export function execCommand(command: string, cwd: string, timeout = 120000): Promise<CommandResult> {
  return new Promise((resolve) => {
    try {
      const output = execSync(command, { cwd, encoding: 'utf-8', stdio: 'pipe', timeout });
      resolve({ success: true, output: output || 'Command completed' });
    } catch (_err) {
      const error = _err as { stdout?: string; stderr?: string; message?: string };
      resolve({
        success: false,
        output: error.stdout || error.stderr || error.message || 'Command failed',
      });
    }
  });
}
