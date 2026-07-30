import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const ROOT = resolve('f:/PROJETOS/ai-devkit-workspace/IDEIA');
const PACKAGES_DIR = join(ROOT, 'packages');

const COMMON_INTERNAL_DEPS = [
  '@ideia/logger',
  '@ideia/contracts',
  '@ideia/event-bus',
  '@ideia/data-layer',
  '@ideia/audit-trail',
  '@ideia/memory-store',
  '@ideia/agent-runtime',
  '@ideia/llm-provider',
  '@ideia/mcp',
  '@ideia/config-engine',
  '@ideia/quality-gates',
  '@ideia/policy-engine'
];

function addProjectReferences(packagePath: string): number {
  const tsconfigPath = join(packagePath, 'tsconfig.json');
  const packageJsonPath = join(packagePath, 'package.json');
  
  try {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
    const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const internalDeps = Object.keys(allDeps).filter(dep => dep.startsWith('@ideia/'));
    
    if (internalDeps.length === 0) return 0;
    
    const tsconfig = JSON.parse(readFileSync(tsconfigPath, 'utf8'));
    
    if (!tsconfig.references) {
      tsconfig.references = [];
    }
    
    const existingRefs = new Set(tsconfig.references.map((ref: any) => ref.path));
    let addedCount = 0;
    
    for (const dep of internalDeps) {
      const packageName = dep.replace('@ideia/', '');
      const refPath = '../' + packageName;
      
      if (!existingRefs.has(refPath)) {
        tsconfig.references.push({ path: refPath });
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      writeFileSync(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n', 'utf8');
      console.log('Added', addedCount, 'references to:', packagePath);
      return addedCount;
    }
    
    return 0;
  } catch (e) {
    return 0;
  }
}

const packages = readdirSync(PACKAGES_DIR);
let totalAdded = 0;

for (const pkg of packages) {
  const pkgPath = join(PACKAGES_DIR, pkg);
  const added = addProjectReferences(pkgPath);
  totalAdded += added;
}

console.log('Total references added:', totalAdded);
