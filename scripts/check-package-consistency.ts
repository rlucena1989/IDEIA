import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');
const PACKAGES = join(ROOT, 'packages');

interface Issue {
  package: string;
  field: string;
  message: string;
}

function main(): void {
  const dirs = readdirSync(PACKAGES);
  const issues: Issue[] = [];

  for (const dir of dirs) {
    const pkgPath = join(PACKAGES, dir, 'package.json');
    if (!existsSync(pkgPath)) continue;

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));

    if (!pkg.license) issues.push({ package: dir, field: 'license', message: 'Missing license field' });
    if (!pkg.version) issues.push({ package: dir, field: 'version', message: 'Missing version' });
    if (!pkg.bugs) issues.push({ package: dir, field: 'bugs', message: 'Missing bugs field' });
    if (!pkg.files) issues.push({ package: dir, field: 'files', message: 'Missing files field' });
    if (pkg.files && (!Array.isArray(pkg.files) || !pkg.files.includes('dist'))) {
      issues.push({ package: dir, field: 'files', message: 'files should include "dist"' });
    }
    if (pkg.main && !existsSync(join(PACKAGES, dir, pkg.main))) {
      issues.push({ package: dir, field: 'main', message: `main points to non-existent: ${pkg.main}` });
    }
    if (pkg.types && !existsSync(join(PACKAGES, dir, pkg.types))) {
      issues.push({ package: dir, field: 'types', message: `types points to non-existent: ${pkg.types}` });
    }
    if (!pkg.repository) issues.push({ package: dir, field: 'repository', message: 'Missing repository field' });

    if (!/^\d+\.\d+\.\d+/.test(pkg.version || '')) {
      issues.push({ package: dir, field: 'version', message: `Invalid version: ${pkg.version}` });
    }
  }

  console.log(`\n# Package.json Consistency Check`);
  console.log(`**Pacotes verificados:** ${dirs.length}`);
  console.log(`**Problemas encontrados:** ${issues.length}\n`);

  if (issues.length > 0) {
    console.log('## Issues\n');
    for (const issue of issues) {
      console.log(`- [${issue.package}] ${issue.field}: ${issue.message}`);
    }
  }

  process.exit(issues.length > 0 ? 1 : 0);
}

main();
