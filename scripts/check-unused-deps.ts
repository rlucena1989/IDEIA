import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

interface Issue {
  package: string;
  type: 'phantom' | 'missing';
  dep: string;
}

function getAllSourceFiles(dir: string): string[] {
  const result: string[] = [];
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '__tests__' && entry.name !== 'dist') {
        result.push(...getAllSourceFiles(full));
      } else if (entry.name.endsWith('.ts')) {
        result.push(full);
      }
    }
  } catch {}
  return result;
}

function isDepImported(files: string[], dep: string): boolean {
  const depName = dep.startsWith('@') ? dep : dep.split('/').pop() ?? dep;
  for (const f of files) {
    const content = readFileSync(f, 'utf8');
    if (content.includes(`from '${dep}'`) || content.includes(`from "${dep}"`) ||
        content.includes(`require('${dep}')`) || content.includes(`require("${dep}")`)) {
      return true;
    }
  }
  return false;
}

function main(): void {
  const dirs = readdirSync(PACKAGES);
  const issues: Issue[] = [];

  for (const dir of dirs) {
    const pkgPath = join(PACKAGES, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;

    const srcDir = join(PACKAGES, dir, 'src');
    if (!existsSync(srcDir)) continue;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    const files = getAllSourceFiles(srcDir);

    for (const [dep] of Object.entries(allDeps)) {
      if (!isDepImported(files, dep)) {
        issues.push({ package: dir, type: 'phantom', dep });
      }
    }
  }

  console.log(`\n# Unused Dependencies Check`);
  console.log(`**Phantom dependencies (declared but not imported):** ${issues.length}\n`);

  if (issues.length > 0) {
    for (const issue of issues) {
      console.log(`- [${issue.type}] ${issue.package}: ${issue.dep}`);
    }
  }

  process.exit(issues.length > 5 ? 1 : 0);
}

main();
