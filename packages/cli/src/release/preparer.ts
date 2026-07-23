import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

/** Interface que define a estrutura de release prepare result. */
export interface ReleasePrepareResult {
  version: string;
  tag: string;
  changelogPath: string;
  previousVersion: string;
  commitsSinceLast: number;
}

/**
 * Prepara release.
 * @param version - Valor version.
 * @param dryRun - Valor run.
 * @returns O resultado da operaÃ§Ã£o.
 */
export function prepareRelease(version: string, dryRun: boolean = false): ReleasePrepareResult {
  const root = process.cwd();
  let previousVersion = '0.0.0';

  try {
    const tags = execFileSync('git tag --sort=-v:refname 2>/dev/null', { cwd: root, encoding: 'utf-8' });
    const tagList = tags.split('\n').filter(Boolean);
    if (tagList.length > 0) previousVersion = tagList[0]!.replace(/^v/, '');
  } catch { /* no tags */ }

  let commitsSinceLast = 0;
  try {
    const log = previousVersion !== '0.0.0'
      ? execFileSync(`git log v${previousVersion}..HEAD --oneline 2>/dev/null || git log --oneline 2>/dev/null`, { cwd: root, encoding: 'utf-8' })
      : execFileSync('git log --oneline 2>/dev/null', { cwd: root, encoding: 'utf-8' });
    commitsSinceLast = log.split('\n').filter(Boolean).length;
  } catch { /* no commits */ }

  const tag = `v${version}`;
  const changelogPath = 'CHANGELOG.md';

  if (!dryRun) {
    const packageJsonPath = path.join(root, 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      pkg.version = version;
      fs.writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + '\n');
    }

    const packagesDir = path.join(root, 'packages');
    if (fs.existsSync(packagesDir)) {
      for (const pkgDir of fs.readdirSync(packagesDir)) {
        const pkgJsonPath = path.join(packagesDir, pkgDir, 'package.json');
        if (fs.existsSync(pkgJsonPath)) {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
          pkg.version = version;
          fs.writeFileSync(pkgJsonPath, JSON.stringify(pkg, null, 2) + '\n');
        }
      }
    }

    try {
      const changelogHeader = `## ${new Date().toISOString().split('T')[0]} â€” v${version}\n\n`;
      if (fs.existsSync(changelogPath)) {
        const existing = fs.readFileSync(changelogPath, 'utf-8');
        fs.writeFileSync(changelogPath, changelogHeader + existing);
      } else {
        fs.writeFileSync(changelogPath, `# Changelog\n\n${changelogHeader}\n`);
      }
    } catch { /* changelog write error */ }

    try {
      execFileSync(`git add package.json packages/*/package.json ${changelogPath} 2>/dev/null || true`, { cwd: root });
      execFileSync(`git commit -m "chore: bump version to ${version}" --no-verify 2>/dev/null || true`, { cwd: root });
      execFileSync(`git tag -a ${tag} -m "Release ${tag}" 2>/dev/null || true`, { cwd: root });
    } catch { /* git ops error */ }
  }

  return { version, tag, changelogPath, previousVersion, commitsSinceLast };
}
