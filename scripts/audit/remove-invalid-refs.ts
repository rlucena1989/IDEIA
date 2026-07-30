import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function removeInvalidReferences(packagePath: string): number {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageJsonPath = join(packagePath, 'package.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.references) {
      return 0;
    }
    
    const validRefs = [];
    let removedCount = 0;
    
    for (const ref of tsconfig.references) {
      const refPackageName = ref.path.replace('../', '');
      const depName = '@ideia/' + refPackageName;
      
      // Only keep reference if it's in dependencies
      if (allDeps[depName]) {
        validRefs.push(ref);
      } else {
        console.log('Removing invalid reference from', packageName, ':', ref.path);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      tsconfig.references = validRefs;
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      return removedCount;
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

const packages = readdirSync(PACKAGES_DIR);
let totalRemoved = 0;

for (const pkg of packages) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  totalRemoved += removeInvalidReferences(pkgPath);
}

console.log('Total invalid references removed:', totalRemoved);
