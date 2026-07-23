/**
 * canary-publish.ts â€” Publica pacotes com tag canary
 *
 * Usage: npx tsx scripts/canary-publish.ts <suffix>
 * Example: npx tsx scripts/canary-publish.ts 20260718-a1b2c3d
 *
 * VersÃ£o de cada pacote: <version>-canary.<suffix>
 */

import { execFileSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, resolve } from 'path';

const suffix = process.argv[2];
if (!suffix) {
  console.error('Usage: npx tsx scripts/canary-publish.ts <suffix>');
  process.exit(1);
}

const root = resolve(__dirname, '..');
const workspacesRaw = execFileSync('npm query .workspace', { cwd: root, encoding: 'utf8' });
const workspaceDirs: string[] = [];
const wsMatch = workspacesRaw.match(/"location":"([^"]+)"/g);
if (wsMatch) {
  for (const m of wsMatch) {
    const dir = m.replace(/"location":"/, '').replace('"', '');
    workspaceDirs.push(dir);
  }
}

const packages = ['', ...workspaceDirs];
let published = 0;

for (const dir of packages) {
  const pkgPath = dir ? join(root, dir, 'package.json') : join(root, 'package.json');
  try {
    const orig = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    if (orig.private) continue;
    const canaryVersion = `${orig.version}-canary.${suffix}`;
    const canary = { ...orig, version: canaryVersion };
    writeFileSync(pkgPath, JSON.stringify(canary, null, 2) + '\n');
    const tag = dir ? `--tag canary` : '';
    execFileSync(`npm publish ${tag} --access public --provenance --ignore-scripts`, {
      cwd: dir ? join(root, dir) : root,
      encoding: 'utf8',
      stdio: 'pipe',
    });
    writeFileSync(pkgPath, JSON.stringify(orig, null, 2) + '\n');
    console.log(`  âœ“ ${orig.name}@${canaryVersion}`);
    published++;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error(`  âœ— ${dir || 'root'}: ${msg}`);
  }
}

console.log(`\nPublished ${published} canary packages`);
