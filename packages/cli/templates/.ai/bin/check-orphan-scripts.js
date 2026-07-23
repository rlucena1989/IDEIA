const fs = require('fs');
const path = require('path');
const root = process.cwd();

const ORPHAN_PATTERN = /^(fix|patch|wipe|test)[-_].*\.(js|ts)$/i;
const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.next']);

function walk(dir, results) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (e) { return; }
    for (const entry of entries) {
        if (IGNORE_DIRS.has(entry.name)) continue;
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full, results);
        else if (ORPHAN_PATTERN.test(entry.name)) {
            const normalized = full.replace(/\\/g, '/');
            if (!normalized.includes('packages/cli/src/commands/') && !normalized.includes('.ai/audit') && !normalized.includes('06-PATCH-HISTORY') && !normalized.includes('patch-applier.js') && !normalized.includes('test-matrix.js') && !normalized.includes('test-example.ts') && !normalized.includes('.ai/bin/test-generate.js') && !normalized.includes('.ai/bin/test-matrix.js')) {
                results.push(full);
            }
        }
    }
}

const found = [];
walk(root, found);

if (found.length === 0) {
    console.log("✅ Nenhum script órfão encontrado.");
    process.exit(0);
}

console.error(`❌ ${found.length} script(s) órfão(s) encontrado(s):`);
found.forEach(f => console.error(`- ${path.relative(root, f)}`));
process.exit(1);
