import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function removeLlmProviderReference(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageJsonPath = join(packagePath, 'package.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const hasLlmProviderDep = packageJson.dependencies?.['@ideia/llm-provider'] || packageJson.devDependencies?.['@ideia/llm-provider'];
    
    if (hasLlmProviderDep) {
      return false; // Keep reference if it's in dependencies
    }
    
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.references) {
      return false;
    }
    
    const originalLength = tsconfig.references.length;
    tsconfig.references = tsconfig.references.filter((ref: any) => ref.path !== '../llm-provider');
    
    if (tsconfig.references.length !== originalLength) {
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Removed llm-provider reference from:', packageName);
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
  if (removeLlmProviderReference(pkgPath)) {
    count++;
  }
}

console.log('Total packages updated:', count);
