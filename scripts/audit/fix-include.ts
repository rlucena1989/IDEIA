import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function fixIncludePattern(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    // Fix include pattern to be more specific
    if (tsconfig.include && tsconfig.include.includes('src')) {
      tsconfig.include = ['src/**/*.ts'];
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Fixed include pattern in:', packageName);
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
  if (fixIncludePattern(pkgPath)) {
    count++;
  }
}

console.log('Total packages fixed:', count);
