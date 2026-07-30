#!/usr/bin/env tsx
import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

interface Commit {
  hash: string;
  message: string;
  author: string;
  date: string;
  type: string;
}

function getCommitsSinceLastTag(): Commit[] {
  try {
    let lastTag = '';
    try {
      lastTag = execSync('git describe --tags --abbrev=0 2>/dev/null', { encoding: 'utf-8' }).trim();
    } catch {
      lastTag = execSync('git rev-list --max-parents=0 HEAD', { encoding: 'utf-8' }).trim();
    }

    const log = execSync(`git log ${lastTag}..HEAD --format="%H|%s|%an|%ad" --date=short 2>/dev/null`, { encoding: 'utf-8' });
    return log.trim().split('\n').filter(Boolean).map(line => {
      const [hash, ...rest] = line.split('|');
      const message = rest[0] || '';
      const author = rest[1] || '';
      const date = rest[2] || '';
      const type = message.match(/^(\w+)/)?.[1] || 'chore';
      return { hash: hash.substring(0, 8), message, author, date, type };
    });
  } catch {
    return [];
  }
}

function getCurrentVersion(): string {
  const pkg = JSON.parse(readFileSync('package.json', 'utf-8'));
  const parts = pkg.version.split('.').map(Number);
  parts[2] = (parts[2] || 0) + 1;
  return parts.join('.');
}

async function generate(): Promise<string> {
  const commits = getCommitsSinceLastTag();
  if (commits.length === 0) return 'No new commits since last tag.\n';

  const sections: Record<string, Commit[]> = {
    '🚀 Features': [],
    '🐛 Bug Fixes': [],
    '🔒 Security': [],
    '⚡ Performance': [],
    '📝 Documentation': [],
    '🧠 AI & Agents': [],
    '🔧 Maintenance': [],
  };

  for (const commit of commits) {
    switch (commit.type) {
      case 'feat': sections['🚀 Features'].push(commit); break;
      case 'fix': sections['🐛 Bug Fixes'].push(commit); break;
      case 'security': sections['🔒 Security'].push(commit); break;
      case 'perf': sections['⚡ Performance'].push(commit); break;
      case 'docs': sections['📝 Documentation'].push(commit); break;
      case 'agent': case 'ai': sections['🧠 AI & Agents'].push(commit); break;
      default: sections['🔧 Maintenance'].push(commit);
    }
  }

  const version = getCurrentVersion();
  const date = new Date().toISOString().split('T')[0];

  let changelog = `## [${version}] - ${date}\n\n`;
  changelog += `### Summary\n`;
  changelog += `- ${commits.length} commits since last release\n`;
  const authors = new Set(commits.map(c => c.author));
  changelog += `- ${authors.size} contributors\n\n`;

  for (const [section, items] of Object.entries(sections)) {
    if (items.length > 0) {
      changelog += `### ${section}\n`;
      for (const item of items) {
        changelog += `- ${item.message} (${item.author}, ${item.hash})\n`;
      }
      changelog += '\n';
    }
  }

  return changelog;
}

async function main(): Promise<void> {
  const changelogEntry = await generate();
  const outputPath = process.argv.find(a => a.startsWith('--output='))?.split('=')[1];
  if (outputPath) {
    let existing = '';
    if (existsSync(outputPath)) {
      existing = readFileSync(outputPath, 'utf-8');
    }
    writeFileSync(outputPath, changelogEntry + '\n' + existing);
    console.log(`✅ Changelog written to ${outputPath}`);
  } else {
    console.log(changelogEntry);
  }
}

main().catch(console.error);
