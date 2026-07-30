import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

const packagesToFix = ['config-engine', 'event-bus', 'metrics-store', 'delivery-orchestrator', 'mcp', 'memory-store', 'observability-engine', 'audit-trail', 'contracts'];

function fixIncludeAndComposite(packagePath: string): boolean {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageName = packagePath.split('\\').pop();
  
  try {
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    let modified = false;
    
    // Fix include pattern
    if (tsconfig.include && (tsconfig.include.includes('src') || tsconfig.include[0] === 'src')) {
      tsconfig.include = ['src/**/*.ts'];
      modified = true;
    }
    
    // Ensure composite
    if (!tsconfig.compilerOptions) {
      tsconfig.compilerOptions = {};
    }
    if (!tsconfig.compilerOptions.composite) {
      tsconfig.compilerOptions.composite = true;
      modified = true;
    }
    
    if (modified) {
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Fixed', packageName);
      return true;
    }
    
    return false;
  } catch (e) {
    return false;
  }
}

for (const pkg of packagesToFix) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  fixIncludeAndComposite(pkgPath);
}

console.log('Done');
