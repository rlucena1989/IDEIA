import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function restoreCommonReferences(packagePath: string): void {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    // Restore common references
    const commonRefs = ['../logger', '../contracts', '../event-bus', '../audit-trail', '../data-layer', '../memory-store'];
    
    if (!tsconfig.references) {
      tsconfig.references = [];
    }
    
    const existingRefs = new Set(tsconfig.references.map((ref: any) => ref.path));
    let addedCount = 0;
    
    for (const ref of commonRefs) {
      if (!existingRefs.has(ref)) {
        tsconfig.references.push({ path: ref });
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
    }
  } catch (e) {
    // Ignore
  }
}

const packages = readdirSync(PACKAGES_DIR);

for (const pkg of packages) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  restoreCommonReferences(pkgPath);
}

console.log('Done restoring common references');
