import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function addLoggerReference(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageJsonPath = join(packagePath, 'package.json');
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const hasLoggerDep = packageJson.dependencies?.['@ideia/logger'] || packageJson.devDependencies?.['@ideia/logger'];
    
    if (!hasLoggerDep) return false;
    
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.references) {
      tsconfig.references = [];
    }
    
    const hasLoggerRef = tsconfig.references.some((ref: any) => ref.path === '../logger');
    
    if (hasLoggerRef) return false;
    
    tsconfig.references.push({ path: '../logger' });
    
    writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
    console.log('Added logger reference to:', packagePath);
    return true;
  } catch (e) {
    return false;
  }
}

const packages = readdirSync(PACKAGES_DIR);
let count = 0;

for (const pkg of packages) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  if (addLoggerReference(pkgPath)) {
    count++;
  }
}

console.log('Total packages updated:', count);
