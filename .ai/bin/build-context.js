#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const ROOT = process.cwd();

const PROFILES = {
  bugfix: { maxFiles: 8, maxChars: 30000, policies: true, designSystem: true, testsNearby: true, logs: true },
  feature: { maxFiles: 20, maxChars: 80000, policies: true, designSystem: true, architecture: true, testsNearby: true },
  refactor: { maxFiles: 15, maxChars: 50000, policies: true, testsNearby: true, adrs: true },
  docs: { maxFiles: 10, maxChars: 40000, policies: true, readme: true, changelog: true },
  'security-review': { maxFiles: 15, maxChars: 60000, policies: true, security: true, dependencies: true, infrastructure: true },
};

function hash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function findFiles(root, extensions) {
  const result = [];
  function walk(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'dist') continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (extensions.some(e => entry.name.endsWith(e))) result.push(full);
      }
    } catch {}
  }
  walk(root);
  return result;
}

function main() {
  const args = process.argv.slice(2);
  let profileName = 'feature';
  let customFiles = [];

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--profile' && args[i + 1]) { profileName = args[i + 1]; i++; }
    if (args[i] === '--files' && args[i + 1]) { customFiles = args[i + 1].split(','); i++; }
    if (args[i] === '--help') {
      console.log('Usage: build-context.js [--profile <profile>] [--files <file1,file2>]');
      console.log('Profiles: bugfix, feature, refactor, docs, security-review');
      process.exit(0);
    }
  }

  if (!PROFILES[profileName]) {
    console.error(`Unknown profile: ${profileName}. Available: ${Object.keys(PROFILES).join(', ')}`);
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const profile = PROFILES[profileName];
  const included = new Set();

  for (const file of customFiles) included.add(file);

  if (profile.policies) {
    const policiesDir = path.join(ROOT, '.ai/policies');
    if (fs.existsSync(policiesDir)) {
      fs.readdirSync(policiesDir).filter(f => f.endsWith('.yaml') || f.endsWith('.md')).forEach(f => included.add(path.join('.ai/policies', f)));
    }
    included.add('.ai/laws.yaml');
  }
  if (profile.designSystem) included.add('.ai/design-system/contract.yaml');
  if (profile.security) {
    const securityDir = path.join(ROOT, '.ai/security');
    if (fs.existsSync(securityDir)) {
      fs.readdirSync(securityDir).filter(f => f.endsWith('.md')).forEach(f => included.add(path.join('.ai/security', f)));
    }
  }
  if (profile.architecture) included.add('.ai/project-manifest.yaml');
  if (profile.readme) included.add('README.md');
  if (profile.changelog) included.add('CHANGELOG.md');

  const srcFiles = findFiles(path.join(ROOT, 'packages'), ['.ts', '.tsx']).slice(0, profile.maxFiles);
  for (const f of srcFiles) {
    included.add(path.relative(ROOT, f));
  }

  const includedArr = Array.from(included).sort().slice(0, profile.maxFiles);
  const contextLines = includedArr.map(f => {
    const fullPath = path.join(ROOT, f);
    if (!fs.existsSync(fullPath)) return `# ${f} (not found)`;
    try {
      const content = fs.readFileSync(fullPath, 'utf8');
      return `# File: ${f}\n\`\`\`\n${content.slice(0, 3000)}\n\`\`\`\n`;
    } catch {
      return `# ${f} (error reading)`;
    }
  });

  const contextText = contextLines.join('\n').slice(0, profile.maxChars);

  const manifest = {
    profile: profileName,
    generated_at: new Date().toISOString(),
    files_included: includedArr,
    files_excluded: ['.env', 'node_modules/', '.git/', 'dist/', 'coverage/'],
    total_chars: contextText.length,
    hash: `sha256:${hash(contextText)}`,
  };

  const cacheDir = path.join(ROOT, '.ai/context/cache');
  fs.mkdirSync(cacheDir, { recursive: true });
  fs.writeFileSync(path.join(cacheDir, 'latest-context.md'), contextText, 'utf8');
  fs.writeFileSync(path.join(cacheDir, 'latest-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');

  console.log(`Context built for profile: ${profileName}`);
  console.log(`Files: ${includedArr.length}, Chars: ${contextText.length}`);
  console.log(JSON.stringify(manifest, null, 2));
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
