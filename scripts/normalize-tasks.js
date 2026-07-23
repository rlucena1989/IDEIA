#!/usr/bin/env node

/**
 * Normalize Tasks — Scans all study files for TASK-IDEIA references,
 * compiles a master list, identifies duplicates/gaps, and generates a registry.
 *
 * Usage:
 *   node scripts/normalize-tasks.js                          # scan and report
 *   node scripts/normalize-tasks.js --fix                    # fix duplicates
 *   node scripts/normalize-tasks.js --output registry.json   # save registry
 */

const fs = require('fs');
const path = require('path');

const ROOT = process.cwd();
const ESTUDOS_DIR = path.join(ROOT, 'docs', 'ESTUDOS');
const OUTPUT_FILE = path.join(ROOT, 'docs', 'governance', 'task-registry.md');

const TASK_PATTERN = /TASK-IDEIA-\d+|TASK-IDE-\d+|AUTO-[A-Z0-9-]+|[A-Z]+-\d{3}/g;
const TASK_TABLE_PATTERN = /\|.*?\|.*?\|.*?\|/g;

async function scan() {
  console.log(`[NormalizeTasks] Scanning ${ESTUDOS_DIR} for task references...\n`);

  if (!fs.existsSync(ESTUDOS_DIR)) {
    console.error(`ESTUDOS directory not found: ${ESTUDOS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(ESTUDOS_DIR)
    .filter(f => f.endsWith('.md'))
    .filter(f => f !== 'TEMPLATE-ANALISE-PERMANENTE.md');

  const allTasks = [];
  const taskLocations = new Map();
  const duplicateTasks = new Map();

  for (const file of files) {
    const filePath = path.join(ESTUDOS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const matches = content.match(TASK_PATTERN) || [];
    const uniqueTasks = new Set(matches);

    for (const task of uniqueTasks) {
      if (!taskLocations.has(task)) taskLocations.set(task, []);
      taskLocations.get(task).push(file);

      if (taskLocations.get(task).length > 1) {
        duplicateTasks.set(task, taskLocations.get(task));
      }
    }

    // Find task tables
    let inTable = false;
    let tableLines = [];
    for (const line of lines) {
      if (line.trim().startsWith('|') && (line.includes('Task') || line.includes('TASK') || line.includes('ID'))) {
        inTable = true;
        tableLines = [line];
        continue;
      }
      if (inTable && line.trim().startsWith('|')) {
        tableLines.push(line);
        continue;
      }
      if (inTable && tableLines.length >= 3) {
        // Parse table rows (skip header and separator)
        for (let i = 2; i < tableLines.length; i++) {
          const cols = tableLines[i].split('|').map(c => c.trim()).filter(Boolean);
          if (cols.length >= 2) {
            allTasks.push({
              taskId: cols[0],
              description: cols[1] || '',
              effort: cols[2] || '',
              sourceFile: file,
              lineNumber: lines.indexOf(tableLines[i]) + 1,
            });
          }
        }
        inTable = false;
        tableLines = [];
      }
    }
  }

  // Find gaps: files without any task references
  const filesWithoutTasks = [];
  for (const file of files) {
    const filePath = path.join(ESTUDOS_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    if (!TASK_PATTERN.test(content)) {
      filesWithoutTasks.push(file);
    }
  }

  // Compile master registry
  const registry = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalFiles: files.length,
      filesWithTasks: files.length - filesWithoutTasks.length,
      filesWithoutTasks: filesWithoutTasks.length,
      uniqueTasks: taskLocations.size,
      duplicateTasks: duplicateTasks.size,
      parsedTaskEntries: allTasks.length,
    },
    uniqueTasks: Array.from(taskLocations.entries()).map(([task, locations]) => ({
      taskId: task,
      occurrences: locations.length,
      files: locations,
    })).sort((a, b) => a.taskId.localeCompare(b.taskId)),
    duplicates: Array.from(duplicateTasks.entries()).map(([task, files]) => ({
      taskId: task,
      files,
    })),
    filesWithoutTasks: filesWithoutTasks.map(f => ({
      file: f,
      path: path.join(ESTUDOS_DIR, f),
    })),
    parsedTasks: allTasks,
  };

  // Output
  console.log(`Files scanned: ${registry.summary.totalFiles}`);
  console.log(`Files with tasks: ${registry.summary.filesWithTasks}`);
  console.log(`Files without tasks: ${registry.summary.filesWithoutTasks}`);
  console.log(`Unique tasks found: ${registry.summary.uniqueTasks}`);
  console.log(`Duplicate tasks: ${registry.summary.duplicateTasks}`);
  console.log(`Parsed task entries: ${registry.summary.parsedTaskEntries}`);

  if (registry.duplicates.length > 0) {
    console.log('\n⚠️  DUPLICATE TASKS FOUND:');
    for (const dup of registry.duplicates) {
      console.log(`  ${dup.taskId}: ${dup.files.join(', ')}`);
    }
  }

  if (registry.filesWithoutTasks.length > 0) {
    console.log('\n⚠️  FILES WITHOUT TASKS:');
    for (const f of registry.filesWithoutTasks) {
      console.log(`  ${f.file}`);
    }
  }

  // Write markdown report
  const args = process.argv.slice(2);
  const fixMode = args.includes('--fix');
  const outputFile = args.find(a => a.startsWith('--output='))?.split('=')[1];

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(registry, null, 2));
    console.log(`\nRegistry saved to ${outputFile}`);
  }

  // Write markdown report
  if (!outputFile || outputFile.endsWith('.json')) {
    writeMarkdownReport(registry);
  }

  // Fix duplicates by adding unique suffixes
  if (fixMode) {
    console.log('\n🔧 FIX MODE: Renaming duplicate tasks...');
    let fixCount = 0;
    for (const dup of registry.duplicates) {
      const [taskId, files] = [dup.taskId, dup.files];
      for (let i = 1; i < files.length; i++) {
        const filePath = path.join(ESTUDOS_DIR, files[i]);
        let content = fs.readFileSync(filePath, 'utf-8');
        const suffix = files[i].replace('.md', '').slice(0, 8).toUpperCase();
        content = content.replace(new RegExp(taskId, 'g'), `${taskId}-${suffix}`);
        fs.writeFileSync(filePath, content, 'utf-8');
        fixCount++;
      }
    }
    console.log(`Fixed ${fixCount} duplicate references`);
  }

  return registry;
}

function writeMarkdownReport(registry) {
  const md = [
    `# Task Registry — Normalized Task List`,
    ``,
    `> Generated automatically by \`scripts/normalize-tasks.js\``,
    `> Generated at: ${registry.generatedAt}`,
    ``,
    `## Summary`,
    ``,
    `| Metric | Value |`,
    `|--------|:-----:|`,
    `| Files Scanned | ${registry.summary.totalFiles} |`,
    `| Files With Tasks | ${registry.summary.filesWithTasks} |`,
    `| Files Without Tasks | ${registry.summary.filesWithoutTasks} |`,
    `| Unique Tasks | ${registry.summary.uniqueTasks} |`,
    `| Duplicate Tasks | ${registry.summary.duplicateTasks} |`,
    `| Parsed Task Entries | ${registry.summary.parsedTaskEntries} |`,
    ``,
  ];

  if (registry.uniqueTasks.length > 0) {
    md.push(`## Unique Tasks (${registry.uniqueTasks.length})`);
    md.push(``);
    md.push(`| Task ID | Occurrences | Files |`);
    md.push(`|---------|:-----------:|-------|`);
    for (const task of registry.uniqueTasks) {
      md.push(`| ${task.taskId} | ${task.occurrences} | ${task.files.join(', ')} |`);
    }
    md.push(``);
  }

  if (registry.duplicates.length > 0) {
    md.push(`## ⚠️ Duplicate Tasks (${registry.duplicates.length})`);
    md.push(``);
    md.push(`| Task ID | Files |`);
    md.push(`|---------|-------|`);
    for (const dup of registry.duplicates) {
      md.push(`| ${dup.taskId} | ${dup.files.join(', ')} |`);
    }
    md.push(``);
  }

  if (registry.filesWithoutTasks.length > 0) {
    md.push(`## ⚠️ Files Without Tasks (${registry.filesWithoutTasks.length})`);
    md.push(``);
    md.push(`| File |`);
    md.push(`|------|`);
    for (const f of registry.filesWithoutTasks) {
      md.push(`| ${f.file} |`);
    }
    md.push(``);
    md.push(`> These files are missing TASK-IDEIA references. Consider adding tasks for gap tracking.`);
    md.push(``);
  }

  md.push(`## Parsed Task Entries (${registry.parsedTasks.length})`);
  md.push(``);
  md.push(`| Task ID | Description | Effort | Source |`);
  md.push(`|---------|-------------|:------:|--------|`);
  for (const task of registry.parsedTasks) {
    md.push(`| ${task.taskId} | ${task.description.replace(/\|/g, '\\|')} | ${task.effort} | ${task.sourceFile}:${task.lineNumber} |`);
  }
  md.push(``);
  md.push(`---`);
  md.push(`*Registry generated by NormalizeTasks*`);

  const dir = path.dirname(OUTPUT_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, md.join('\n'), 'utf-8');
  console.log(`\nReport written to ${OUTPUT_FILE}`);
}

scan().catch(err => {
  console.error('NormalizeTasks failed:', err.message);
  process.exit(1);
});
