import { execFile } from 'node:child_process';
import { readdirSync, rmSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve(__dirname, '..');
const PACKAGES_DIR = join(ROOT, 'packages');

const DIRS_TO_CLEAN = ['dist', '.tsbuildinfo', 'coverage', 'node_modules/.cache'];

function clean(): void {
  for (const dir of DIRS_TO_CLEAN) {
    const fullPath = join(ROOT, dir);
    if (existsSync(fullPath)) {
      rmSync(fullPath, { recursive: true, force: true });
      console.log(`Cleaned: ${dir}`);
    }
  }

  if (existsSync(PACKAGES_DIR)) {
    for (const pkg of readdirSync(PACKAGES_DIR)) {
      const pkgDist = join(PACKAGES_DIR, pkg, 'dist');
      const pkgTsbuildinfo = join(PACKAGES_DIR, pkg, 'tsconfig.tsbuildinfo');
      if (existsSync(pkgDist)) {
        rmSync(pkgDist, { recursive: true, force: true });
        console.log(`Cleaned: packages/${pkg}/dist`);
      }
      if (existsSync(pkgTsbuildinfo)) {
        rmSync(pkgTsbuildinfo, { force: true });
      }
    }
  }

  console.log('Clean complete');
}

clean();
