import { execSync } from 'child_process';
import { createLogger } from '@ideia/logger';
import { FixResult } from './types';
const logger = createLogger('auto-fixer');

const FIXABLE_GATES = new Set(['lint', 'format']);

export class AutoFixer {
  async fix(results: any[], projectRoot?: string): Promise<any[]> {
    const root = projectRoot || process.cwd();
    const fixes: any[] = [];

    for (const result of results) {
      if (result.passed || !FIXABLE_GATES.has(result.name)) {
        fixes.push({
          gate: result.name,
          fixes: [],
          success: true,
        });
        continue;
      }

      const applied = await this.applyFix(result.name, root);
      fixes.push({
        gate: result.name,
        fixes: applied,
        success: applied.length > 0,
        error: applied.length === 0 ? `No auto-fix available for ${result.name}` : undefined,
      });
    }

    return fixes;
  }

  async fixGate(gateName: string, script: string, projectRoot?: string): Promise<any> {
    const root = projectRoot || process.cwd();

    if (!FIXABLE_GATES.has(gateName)) {
      return { gate: gateName, fixes: [], success: false, error: `Gate ${gateName} is not auto-fixable` };
    }

    const applied = await this.applyFix(gateName, root);
    return {
      gate: gateName,
      fixes: applied,
      success: applied.length > 0,
      error: applied.length === 0 ? `No auto-fix available for ${gateName}` : undefined,
    };
  }

  isFixable(gateName: string): boolean {
    return FIXABLE_GATES.has(gateName);
  }

  private async applyFix(gateName: string, cwd: string): Promise<string[]> {
    const fixes: string[] = [];

    if (gateName === 'lint') {
      try {
        execSync('npx eslint --fix .', { cwd, timeout: 120000, encoding: 'utf-8' });
        fixes.push('eslint --fix .');
      } catch {
        try {
          execSync('npx eslint --fix src/', { cwd, timeout: 120000, encoding: 'utf-8' });
          fixes.push('eslint --fix src/');
        } catch {
          // eslint may not be available
        }
      }
    }

    if (gateName === 'format') {
      try {
        execSync('npx prettier --write .', { cwd, timeout: 120000, encoding: 'utf-8' });
        fixes.push('prettier --write .');
      } catch {
        try {
          execSync('npx prettier --write src/', { cwd, timeout: 120000, encoding: 'utf-8' });
          fixes.push('prettier --write src/');
        } catch {
          // prettier may not be available
        }
      }
    }

    return fixes;
  }
}


