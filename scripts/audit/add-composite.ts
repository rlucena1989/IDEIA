import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function ensureComposite(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
    }
    
    if (!tsconfig.compilerOptions.composite) {
      tsconfig.compilerOptions.composite = true;
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Added composite to:', packagePath);
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
  if (ensureComposite(pkgPath)) {
    count++;
  }
}

console.log('Total packages updated:', count);
