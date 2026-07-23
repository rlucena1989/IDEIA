
const fs = require('fs');
const path = require('path');

function findRoot(dir) {
    if (fs.existsSync(path.join(dir, 'packages/cli'))) return dir;
    const parent = path.dirname(dir);
    if (dir === '/' || dir === parent) return null;
    return findRoot(parent);
}

const root = findRoot(process.cwd());

if (!root) {
   console.log("⚠️ Skipped: not running inside DevKit repository.");
   process.exit(0);
}

const source = path.join(root, '.ai');
const distTemplates = path.join(root, 'packages/cli/dist/templates/.ai');

const STRICT_MODE = process.argv.includes("--strict");

if (!fs.existsSync(distTemplates)) {
  console.error("❌ Fatal: dist templates missing in DevKit mode. Run 'npm run build'.");
  process.exit(1);
}

const REQUIRED = [
  "project-manifest.yaml",
  "laws.yaml",
  "context/ai-handoff.md",
  "bin/verify.js",
  "bin/quality-agent.js",
  "bin/run-prevention-suite.js",
  "bin/check-portability.js",
  "bin/check-generated-code-risk.js",
  "bin/check-placeholder-policy.js",
  "policies/command-policy.md",
  "policies/ai-generated-code-policy.md",
  "rules/placeholder-policy.yaml"
];

let failed = false;

for (const req of REQUIRED) {
    const srcPath = path.join(source, req);
    const distPath = path.join(distTemplates, req);
    
    if (!fs.existsSync(srcPath)) {
        console.error(`❌ Missing required file in source .ai/: ${req}`);
        failed = true;
    }
    if (!fs.existsSync(distPath)) {
        console.error(`❌ Missing required file in dist templates: ${req}`);
        failed = true;
    }
}

if (failed) process.exit(1);
console.log("✅ Template consistency OK.");
