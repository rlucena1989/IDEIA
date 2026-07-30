import * as path from 'node:path';
import { createLogger } from '@ideia/logger';
import * as fs from 'node:fs';
const logger = createLogger('fs-scope');

export class FsScopeValidator {
  constructor(private allowedBases: string[]) {}

  async validate(targetPath: string): Promise<string> {
    const resolved = path.resolve(targetPath);
    const normalized = path.normalize(targetPath);
    if (normalized.includes('..')) {
      throw new Error('Path traversal detected');
    }
    const allowed = this.allowedBases.some(base => {
      const absBase = path.resolve(base);
      return resolved.startsWith(absBase + path.sep) || resolved === absBase;
    });
    if (!allowed) {
      throw new Error(`Path not in allowed scope: ${resolved}`);
    }
    try {
      const stat = await fs.promises.lstat(resolved);
      if (stat.isSymbolicLink()) {
        const real = await fs.promises.realpath(resolved);
        const stillAllowed = this.allowedBases.some(base => {
          const absBase = path.resolve(base);
          return real.startsWith(absBase + path.sep) || real === absBase;
        });
        if (!stillAllowed) {
          throw new Error('Symlink escape detected');
        }
        return real;
      }
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        return resolved;
      }
      throw err;
    }
    return resolved;
  }
}
