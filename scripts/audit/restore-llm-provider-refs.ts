import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

function restoreLlmProviderReference(packagePath: string): void {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.references) {
      tsconfig.references = [];
    }
    
    const hasLlmProviderRef = tsconfig.references.some((ref: any) => ref.path === '../llm-provider');
    
    if (!hasLlmProviderRef) {
      tsconfig.references.push({ path: '../llm-provider' });
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Restored llm-provider reference to:', packageName);
    }
  } catch (e) {
    // Ignore
  }
}

const packages = readdirSync(PACKAGES_DIR);

for (const pkg of packages) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  restoreLlmProviderReference(pkgPath);
}

console.log('Done restoring llm-provider references');
