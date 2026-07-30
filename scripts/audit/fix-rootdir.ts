import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function fixRootDir(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
    }
    
    // Fix rootDir to be "src" instead of "./src"
    if (tsconfig.compilerOptions.rootDir === './src') {
      tsconfig.compilerOptions.rootDir = 'src';
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Fixed rootDir in:', packagePath);
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

const packages = readdirSync(PACKAGES_DIR);
let count = 0;

for (const pkg of packages) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  if (fixRootDir(pkgPath)) {
    count++;
  }
}

console.log('Total packages fixed:', count);
