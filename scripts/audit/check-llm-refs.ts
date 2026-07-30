import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function checkLlmProviderReferences(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (tsconfig.references) {
      const hasLlmProviderRef = tsconfig.references.some((ref: any) => ref.path === '../llm-provider');
      if (hasLlmProviderRef) {
        console.log(packageName);
        return true;
      }
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

const packages = readdirSync(PACKAGES_DIR);
const packagesWithLlmProvider = [];

for (const pkg of packages) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  if (checkLlmProviderReferences(pkgPath)) {
    packagesWithLlmProvider.push(pkg);
  }
}

console.log('Total packages with llm-provider reference:', packagesWithLlmProvider.length);
