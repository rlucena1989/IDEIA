import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function checkSelfReferences(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (tsconfig.references) {
      const hasSelfRef = tsconfig.references.some((ref: any) => ref.path === '.' || ref.path === './' || ref.path.includes(packageName));
      if (hasSelfRef) {
        console.log('Self-reference found in:', packageName);
        return true;
      }
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
  if (checkSelfReferences(pkgPath)) {
    count++;
  }
}

console.log('Total packages with self-references:', count);
