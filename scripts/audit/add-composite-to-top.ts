import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

const packagesToFix = ['config-engine', 'event-bus', 'metrics-store', 'delivery-orchestrator', 'mcp', 'memory-store', 'observability-engine', 'audit-trail', 'contracts'];

function addComposite(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
    }
    
    if (!tsconfig.compilerOptions.composite) {
      tsconfig.compilerOptions.composite = true;
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Added composite to:', packageName);
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

for (const pkg of packagesToFix) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  addComposite(pkgPath);
}

console.log('Done');
