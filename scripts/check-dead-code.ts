import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

interface DeadExport {
  package: string;
  file: string;
  exportName: string;
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

function findExports(content: string): string[] {
  const exports: string[] = [];
  const patterns = [
    /^export\s+(?:async\s+)?function\s+(\w+)/gm,
    /^export\s+(?:const|let|var)\s+(\w+)/gm,
    /^export\s+(?:abstract\s+)?class\s+(\w+)/gm,
    /^export\s+interface\s+(\w+)/gm,
    /^export\s+type\s+(\w+)/gm,
    /^export\s+enum\s+(\w+)/gm,
    /^export\s+\{\s*(\w+)\s*\}/gm,
  ];
  for (const pattern of patterns) {
    const matches = content.matchAll(pattern);
    for (const m of matches) {
      exports.push(m[1]!);
    }
  }
  return exports;
}

function countUses(files: string[], exportName: string, currentFile: string): number {
  let count = 0;
  for (const f of files) {
    if (f === currentFile) continue;
    const content = readFileSync(f, 'utf8');
    const regex = new RegExp(`\\b${exportName}\\b`, 'g');
    const matches = content.match(regex);
    if (matches) count += matches.length;
  }
  return count;
}

function main(): void {
  const dirs = readdirSync(PACKAGES);
  const allDead: DeadExport[] = [];

  for (const dir of dirs) {
    const srcDir = join(PACKAGES, dir, 'src');
    if (!existsSync(srcDir)) continue;

    const files = getAllSourceFiles(srcDir);
    if (files.length === 0) continue;

    const exports: DeadExport[] = [];
    for (const file of files) {
      const content = readFileSync(file, 'utf8');
      const exportNames = findExports(content);
      for (const name of exportNames) {
        const uses = countUses(files, name, file);
        if (uses === 0) {
          exports.push({ package: dir, file: file.replace(srcDir, ''), exportName: name });
        }
      }
    }
    allDead.push(...exports);
  }

  console.log(`\n# Dead Code Check`);
  console.log(`**Total dead exports:** ${allDead.length}\n`);

  if (allDead.length > 0) {
    const byPackage: Record<string, DeadExport[]> = {};
    for (const d of allDead) {
      if (!byPackage[d.package]) byPackage[d.package] = [];
      byPackage[d.package].push(d);
    }
    for (const [pkg, exports] of Object.entries(byPackage).sort((a, b) => b[1].length - a[1].length)) {
      console.log(`### ${pkg} (${exports.length})`);
      for (const e of exports) {
        console.log(`- \`${e.exportName}\` (${e.file})`);
      }
      console.log('');
    }
  } else {
    console.log('No dead exports found');
  }
}

main();
