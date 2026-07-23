import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';

/** Interface que define a estrutura de publish result. */
export interface PublishResult {
  published: boolean;
  registry: string;
  version: string;
  artifacts: string[];
  errors: string[];
}

/**
 * Publica release.
 * @param version - Valor version.
 * @param dryRun - Valor run.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function publishRelease(version: string, dryRun: boolean = false): PublishResult {
  const root = process.cwd();
  const result: PublishResult = {
    published: false,
    registry: 'npm',
    version,
    artifacts: [],
    errors: [],
  };

  if (!dryRun) {
    try {
      const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const publishArgs = ['publish', '--access', 'public'];
      execFileSync(`${npmBin} ${publishArgs.join(' ')} 2>&1`, { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      result.artifacts.push('npm package');
    } catch (e: unknown) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      result.errors.push(`npm publish: ${errorMsg}`);
    }

    try {
      execFileSync('git push --follow-tags 2>/dev/null', { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
      result.artifacts.push('git tags');
    } catch { /* git push error */ }

    try {
      execFileSync('git push origin --tags 2>/dev/null', { cwd: root, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] });
    } catch { /* git push tags error */ }
  }

  const monorepoPkgs = path.join(root, 'packages');
  if (fs.existsSync(monorepoPkgs)) {
    for (const pkgDir of fs.readdirSync(monorepoPkgs)) {
      const pkgJsonPath = path.join(monorepoPkgs, pkgDir, 'package.json');
      if (fs.existsSync(pkgJsonPath)) {
        if (!dryRun) {
          try {
            const npmBin = process.platform === 'win32' ? 'npm.cmd' : 'npm';
            execFileSync(`${npmBin} publish --access public 2>&1`, {
              cwd: path.join(monorepoPkgs, pkgDir),
              encoding: 'utf-8',
              stdio: ['pipe', 'pipe', 'pipe'],
            });
            result.artifacts.push(`packages/${pkgDir}`);
          } catch { /* subpackage publish error */ }
        } else {
          result.artifacts.push(`packages/${pkgDir} (dry-run)`);
        }
      }
    }
  }

  result.published = result.errors.length === 0 && !dryRun;
  if (dryRun) result.published = true;

  return result;
}
