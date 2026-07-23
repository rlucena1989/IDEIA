import fs from 'node:fs';
import path from 'node:path';

const cwd = process.cwd();

const requiredFiles = ['package.json', 'tsconfig.json'];
const requiredDirs = ['packages', '.ai'];

const missingFiles = requiredFiles.filter((f) => !fs.existsSync(path.resolve(cwd, f)));
const missingDirs = requiredDirs.filter((d) => !fs.existsSync(path.resolve(cwd, d)));

if (missingFiles.length > 0) {
  console.error(`[check-env] Missing required files: ${missingFiles.join(', ')}`);
}

if (missingDirs.length > 0) {
  console.error(`[check-env] Missing required directories: ${missingDirs.join(', ')}`);
}

if (missingFiles.length > 0 || missingDirs.length > 0) {
  process.exit(1);
}

console.log('[check-env] Environment OK');