
const { spawnSync } = require("child_process");
const path = require("path");
const fs = require("fs");
const root = process.cwd();

const checks = [
  ".ai/bin/check-portability.js",
  ".ai/bin/check-health-consistency.js",
  ".ai/bin/check-generated-code-risk.js",
  ".ai/bin/check-placeholder-policy.js",
  ".ai/bin/check-empty-or-decorative-files.js",
  ".ai/bin/check-package-scripts.js",
  ".ai/bin/check-template-consistency.js",
  ".ai/bin/check-artifact-manifest.js",
  ".ai/bin/check-orphan-scripts.js"
];

if (fs.existsSync(path.join(root, "packages/cli"))) {
  checks.push(".ai/bin/check-installer.js");
}

let failed = false;
for (const check of checks) {
  const fullPath = path.join(root, check);
  if (!fs.existsSync(fullPath)) {
    console.warn(`⚠️ Skipping missing check: ${check}`);
    continue;
  }
  console.log(`\n== Running ${check} ==`);
  const result = spawnSync("node", [fullPath], { encoding: 'utf8', cwd: root });
  const output = (result.stdout || '') + (result.stderr || '');
  console.log(output);

  if (output.includes('[critical]')) {
      console.error('❌ Placeholders CRÍTICOS encontrados — bloqueando pipeline.');
      failed = true;
  }

  if (result.status !== 0) {
      failed = true;
  }
  if (result.status !== 0) {
    failed = true;
    console.error(`❌ Check failed: ${check}`);
  }
}

if (failed) {
  console.error("\n❌ Prevention suite failed.");
  process.exit(1);
}
console.log("\n✅ Prevention suite passed.");
