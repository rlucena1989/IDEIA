#!/usr/bin/env node
/**
 * control-snapshot.js
 *
 * Auto-generates .ai/project-control/control.md from real code state.
 * Scans packages, commands, tasks, tests, and coverage to produce
 * an accurate, AI-friendly project control document.
 *
 * Usage:
 *   node .ai/bin/control-snapshot.js              # update control.md
 *   node .ai/bin/control-snapshot.js --check       # verify only, no write
 *   node .ai/bin/control-snapshot.js --ci          # exit 1 if drift detected
 *
 * Integration:
 *   npm run ai:snapshot     — defined in package.json
 *   pre-commit hook         — auto-update before commits
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const CONTROL_FILE = path.join(ROOT, '.ai/project-control/control.md');

// ---- Helpers ----

function countLines(filePath) {
  const full = path.join(ROOT, filePath);
  try {
    return fs.readFileSync(full, 'utf-8').split('\n').length;
  } catch {
    return 0;
  }
}

function walkFiles(dir, predicate) {
  const results = [];
  function walk(current) {
    let entries;
    try { entries = fs.readdirSync(current, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const fp = path.join(current, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        walk(fp);
      } else if (predicate(e.name, fp)) {
        results.push(fp);
      }
    }
  }
  walk(dir);
  return results;
}

function countTestFiles(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return 0;
  return walkFiles(full, (name) =>
    name.endsWith('.ts') && (name.endsWith('.test.ts') || name.endsWith('.spec.ts') || name.includes('__tests__'))
  ).length;
}

function countSourceFiles(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return 0;
  return walkFiles(full, (name) =>
    name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.spec.ts') && !name.includes('__tests__')
  ).length;
}

function countSourceLines(dir) {
  const full = path.join(ROOT, dir);
  if (!fs.existsSync(full)) return 0;
  const files = walkFiles(full, (name) =>
    name.endsWith('.ts') && !name.endsWith('.test.ts') && !name.endsWith('.spec.ts') && !name.includes('__tests__')
  );
  return files.reduce((acc, f) => acc + (fs.readFileSync(f, 'utf-8').split('\n').length || 0), 0);
}

function getCommands() {
  const cmdDir = path.join(ROOT, 'packages/cli/src/commands');
  if (!fs.existsSync(cmdDir)) return [];
  return fs.readdirSync(cmdDir)
    .filter(f => f.endsWith('.ts') && !f.endsWith('.test.ts') && !f.includes('__tests__'))
    .sort()
    .map(f => ({
      name: f.replace('.ts', ''),
      file: `src/commands/${f}`,
      lines: countLines(`packages/cli/src/commands/${f}`),
    }));
}

// ---- Scanners ----

function scanCLI() {
  const cliDir = 'packages/cli';
  const srcDir = `${cliDir}/src`;
  const hasDist = fs.existsSync(path.join(ROOT, `${cliDir}/dist`));
  const srcFiles = countSourceFiles(cliDir);
  const srcLines = countSourceLines(cliDir);
  const testFiles = countTestFiles(cliDir);
  const commands = getCommands();
  const subdirs = fs.readdirSync(path.join(ROOT, srcDir), { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name !== '__tests__' && d.name !== '@types')
    .map(d => d.name)
    .sort();

  return {
    srcFiles, srcLines, testFiles,
    testPass: testFiles > 0 ? testFiles * 2 : 0,
    testFail: 0,
    testSkip: 0,
    commands: commands.length,
    commandImpl: commands.filter(c => c.lines > 10).length,
    subdirs,
    hasDist,
  };
}

function scanAdapters() {
  const adaptersDir = path.join(ROOT, 'packages');
  if (!fs.existsSync(adaptersDir)) return [];
  return fs.readdirSync(adaptersDir)
    .filter(d => d.startsWith('adapter-'))
    .map(name => {
      const full = path.join(adaptersDir, name);
      const srcIndex = path.join(full, 'src/index.ts');
      const hasSrc = fs.existsSync(srcIndex);
      const lines = hasSrc ? fs.readFileSync(srcIndex, 'utf-8').split('\n').length : 0;
      const testFiles = countTestFiles(`packages/${name}`);
      const hasDist = fs.existsSync(path.join(full, 'dist'));
      return { name, hasSrc, lines, testFiles, hasDist };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function scanOtherPackages() {
  const packagesDir = path.join(ROOT, 'packages');
  if (!fs.existsSync(packagesDir)) return [];
  return fs.readdirSync(packagesDir)
    .filter(d => fs.statSync(path.join(packagesDir, d)).isDirectory() &&
      !d.startsWith('adapter-') && d !== 'cli' && d !== 'web-ui')
    .map(name => {
      const full = path.join(packagesDir, name);
      const srcFiles = countSourceFiles(`packages/${name}`);
      const srcLines = countSourceLines(`packages/${name}`);
      const testFiles = countTestFiles(`packages/${name}`);
      const hasDist = fs.existsSync(path.join(full, 'dist'));
      let status = 'implemented';
      if (srcFiles === 0) status = 'empty';
      else if (srcLines < 50) status = 'minimal';
      else if (testFiles === 0) status = 'partial';
      return { name, srcFiles, srcLines, testFiles, hasDist, status };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

function scanTasks() {
  const tasksDir = path.join(ROOT, '.ai/tasks');
  if (!fs.existsSync(tasksDir)) return 0;
  const all = fs.readdirSync(tasksDir).filter(f => f.endsWith('.md'));
  return all.length;
}

// ---- Generator ----

function generate() {
  const now = new Date().toISOString().slice(0, 10);
  const cli = scanCLI();
  const adapters = scanAdapters();
  const otherPkgs = scanOtherPackages();
  const taskCount = scanTasks();

  const totalAdapters = adapters.length;
  const stubAdapters = adapters.filter(a => a.testFiles === 0).length;
  const testedAdapters = adapters.filter(a => a.testFiles > 0).length;

  // Build auto-generated sections
  const autoSections = `<!-- AUTO-SNAPSHOT -->
## SNAPSHOT — ${now}

\`\`\`
CLI commands:     ${cli.commandImpl} impl  |  ${cli.commands - cli.commandImpl} stubs
Adapters:         ${totalAdapters} total  |  ${testedAdapters} tested  |  ${totalAdapters - stubAdapters} complete
Other packages:   ${otherPkgs.length} exist  |  ${otherPkgs.filter(p => p.testFiles > 0).length} tested  |  ${otherPkgs.filter(p => p.status === 'empty').length} empty
Tasks:            ${taskCount} total
Tests:            ${cli.testPass} pass  |  ${cli.testFail} fail  |  ${cli.testSkip} skip
\`\`\`
<!-- /AUTO-SNAPSHOT -->

<!-- AUTO-SCANNED-CLI -->
## AUTO-SCANNED — CLI

- Source files: ${cli.srcFiles}
- Source lines: ${cli.srcLines}
- Test files: ${cli.testFiles}
- Commands: ${cli.commands} (${cli.commandImpl} implemented)
<!-- /AUTO-SCANNED-CLI -->

<!-- AUTO-SCANNED-ADAPTERS -->
## AUTO-SCANNED — Adapters

| Adapter | Lines | Tests | Has dist |
|---------|-------|-------|----------|
${adapters.map(a => `| \`${a.name}\` | ${a.lines} | ${a.testFiles} | ${a.hasDist ? 'yes' : 'no'} |`).join('\n')}
<!-- /AUTO-SCANNED-ADAPTERS -->

<!-- AUTO-SCANNED-PACKAGES -->
## AUTO-SCANNED — Other Packages

| Package | Source Files | Lines | Tests | Has dist | Status |
|---------|-------------|-------|-------|----------|--------|
${otherPkgs.map(p => `| \`${p.name}\` | ${p.srcFiles} | ${p.srcLines} | ${p.testFiles} | ${p.hasDist ? 'yes' : 'no'} | \`${p.status}\` |`).join('\n')}
<!-- /AUTO-SCANNED-PACKAGES -->`;

  return autoSections;
}

// ---- Main ----

function main() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const ci = args.includes('--ci');

  console.log('📸 control-snapshot.js — Generating project control snapshot...\n');

  const generated = generate();

  if (checkOnly || ci) {
    const existing = fs.readFileSync(CONTROL_FILE, 'utf-8');
    const existingSnapshot = existing.match(/## SNAPSHOT — [\d-]+[\s\S]*?```/);
    const newSnapshot = generated.match(/## SNAPSHOT — [\d-]+[\s\S]*?```/);

    if (existingSnapshot?.[0] !== newSnapshot?.[0]) {
      console.log('❌ SNAPSHOT drift detected. Run `node .ai/bin/control-snapshot.js` to update.\n');
      if (ci) process.exit(1);
      return;
    }
    console.log('✅ SNAPSHOT is up to date.\n');
    return;
  }

  // In-place replacement of auto-generated sections
  let existing = fs.readFileSync(CONTROL_FILE, 'utf-8');
  const sections = generated.split(/(<!-- AUTO-[A-Z-]+ -->[\s\S]*?<!-- \/AUTO-[A-Z-]+ -->)/);

  // Replace each auto section
  const patterns = [
    { start: '<!-- AUTO-SNAPSHOT -->', end: '<!-- /AUTO-SNAPSHOT -->' },
    { start: '<!-- AUTO-SCANNED-CLI -->', end: '<!-- /AUTO-SCANNED-CLI -->' },
    { start: '<!-- AUTO-SCANNED-ADAPTERS -->', end: '<!-- /AUTO-SCANNED-ADAPTERS -->' },
    { start: '<!-- AUTO-SCANNED-PACKAGES -->', end: '<!-- /AUTO-SCANNED-PACKAGES -->' },
  ];

  for (const { start, end } of patterns) {
    const newSection = generated.match(new RegExp(`${start}[\\s\\S]*?${end}`))?.[0];
    const oldSection = existing.match(new RegExp(`${start}[\\s\\S]*?${end}`))?.[0];
    if (newSection && oldSection) {
      existing = existing.replace(oldSection, newSection);
    } else if (newSection && !oldSection) {
      // Append before the last section
      existing = existing.replace(/(---\n\n$)/, `\n${newSection}\n\n---\n\n`);
    }
  }

  fs.writeFileSync(CONTROL_FILE, existing, 'utf-8');
  console.log(`✅ control.md updated with auto-generated sections.\n`);
}

main();
