#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

const FORBIDDEN_PATTERNS = [
  { id: "absolute.home.user", regex: /\/home\/user\//g },
  { id: "absolute.users", regex: /\/Users\/[^\/]+/g },
  { id: "absolute.windows.users", regex: /[A-Z]:\\\\Users\\\\[^\\\\]+/g },
  { id: "shell.cp", regex: /\bcp\s+-r\b/g },
  { id: "spawn.cp", regex: /spawnSync\(['"]cp['"]/g },
  { id: "shell.rm.rf", regex: /\brm\s+-rf\b/g },
  { id: "shell.xcopy", regex: /\bxcopy\b/g },
  { id: "shell.robocopy", regex: /\brobocopy\b/g }
];

const SCAN_EXTENSIONS = new Set([".js", ".ts", ".sh", ".ps1", ".bat", ".json", ".yaml", ".yml", ".md"]);
const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "legado", "uploads", "index", "cache", "reports"]);

// Context Allowlist - Permite padrões em contextos inofensivos ou documentações ativas
const ALLOWLIST = [
  "active-prevention-rules.yaml",
  "command-policy.md",
  "permissions.yaml",
  "check-portability.js",
  "setup-report.md",
  "system-audit-execution.log",
  "latest-sync-report.json",
  "system-audit-execution.log",
  "baseline.json",
  "check-all.json",
  "agent-safety-policy.md",
  "latest-context.md",
  "documents.json",
  "agent-security.test.ts"
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

let failures = [];
for (const file of walk(ROOT)) {
  const isAllowlisted = ALLOWLIST.some(al => file.includes(al));
  if (isAllowlisted) continue;

  const content = fs.readFileSync(file, "utf8");
  for (const rule of FORBIDDEN_PATTERNS) {
    const matches = content.match(rule.regex);
    if (matches) {
      failures.push({
        rule: rule.id,
        file: path.relative(ROOT, file),
        matches: Array.from(new Set(matches))
      });
    }
  }
}

if (failures.length > 0) {
  console.error("Portability check failed:");
  for (const failure of failures) {
    console.error(`- [${failure.rule}] ${failure.file}: ${failure.matches.join(", ")}`);
  }
  process.exit(1);
}
console.log("Portability check passed. Allowed files bypassed via Policy.");
