
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

const REPORT_PATH = path.join(ROOT, ".ai/reports/placeholder-policy-report.json");

const DEFAULT_PATTERNS = [
  { id: "todo-token", regex: /\bTODO\b/gi, severity: "medium" },
  { id: "placeholder-token", regex: /\bPLACEHOLDER\b/gi, severity: "high" },
  { id: "stub-token", regex: /\bSTUB\b|IMPLEMENT_ME|NOT_IMPLEMENTED/gi, severity: "critical" },
  { id: "lorem-ipsum", regex: /Lorem ipsum/gi, severity: "high" },
  { id: "fake-not-implemented", regex: /method\s+not\s+implemented|not[\s_-]?supported|função\s+não\s+implementada/gi, severity: "critical" },
  { id: "scaffold-pending", regex: /@scaffold-pending/gi, severity: "warn" }
];

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", ".ai/backups", "legado", "reports", "bin", "rules", "templates", "tasks"]);
const EXECUTABLE_EXTS = new Set([".js", ".ts", ".tsx", ".sh", ".ps1", ".bat"]);
const CONFIG_EXTS = new Set([".json", ".yaml", ".yml"]);
const DOC_EXTS = new Set([".md"]);

const ALLOWLIST = [
  { file: ".ai/rules/placeholder-policy.yaml", ids: ["todo-token", "placeholder-token", "stub-token", "lorem-ipsum", "fake-not-implemented", "scaffold-pending"] },
  { file: ".ai/bin/check-generated-code-risk.js", ids: ["todo-token", "placeholder-token", "stub-token"] },
  { file: ".ai/bin/check-placeholder-policy.js", ids: ["todo-token", "placeholder-token", "stub-token", "lorem-ipsum", "fake-not-implemented", "scaffold-pending"] },
  { file: ".ai/bin/check-template-consistency.js", ids: ["placeholder-token"] },
  { file: ".ai/bin/run-prevention-suite.js", ids: ["placeholder-token"] },
  { file: ".ai/bin/verify.js", ids: ["placeholder-token"] },
  { file: ".ai/reports/placeholder-policy-report.json", ids: ["todo-token", "placeholder-token", "stub-token", "lorem-ipsum"] },
  { file: ".ai/reports/latest-sync-report.json", ids: ["todo-token", "placeholder-token", "stub-token", "lorem-ipsum"] },
  { file: ".ai/prompts/25-prompt-template.md", ids: ["placeholder-token"] },
  { file: "run-full-verification.sh", ids: ["todo-token", "placeholder-token", "stub-token", "lorem-ipsum"] },
  { file: "src/commands/prove.ts", ids: ["todo-token", "placeholder-token", "stub-token", "lorem-ipsum"] },
  { file: "src/commands/audit.ts", ids: ["placeholder-token"] },
  { file: "packages/cli/src/commands/prove.ts", ids: ["todo-token", "placeholder-token", "stub-token", "lorem-ipsum"] },
  { file: "packages/cli/src/commands/audit.ts", ids: ["placeholder-token"] },
  { file: "package-lock.json", ids: ["fake-not-implemented"] }
];

function toRel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function isAllowed(rel, patternId) {
  if (rel.includes("node_modules") || rel.includes("legado")) return true;
  return ALLOWLIST.some((entry) => rel.endsWith(entry.file.split("/").pop()) && entry.ids.includes(patternId));
}

function classify(file) {
  const ext = path.extname(file);
  if (EXECUTABLE_EXTS.has(ext)) return "executable";
  if (CONFIG_EXTS.has(ext)) return "configuration";
  if (DOC_EXTS.has(ext)) return "documentation";
  return "other";
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
      continue;
    }
    const ext = path.extname(entry.name);
    if (EXECUTABLE_EXTS.has(ext) || CONFIG_EXTS.has(ext) || DOC_EXTS.has(ext)) {
      files.push(full);
    }
  }
  return files;
}

const findings = [];
for (const file of walk(ROOT)) {
  const rel = toRel(file);
  const content = fs.readFileSync(file, "utf8");
  const fileClass = classify(file);
  
  for (const pattern of DEFAULT_PATTERNS) {
    const matches = Array.from(content.matchAll(pattern.regex));
    if (matches.length === 0) continue;
    if (isAllowed(rel, pattern.id)) continue;
    
    findings.push({
      file: rel,
      fileClass,
      patternId: pattern.id,
      severity: pattern.severity,
      count: matches.length,
      action: (pattern.severity === "warn" || pattern.severity === "medium") ? "warn" : ((fileClass === "executable" || fileClass === "configuration") ? "fail" : "warn")
    });
  }
}

fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
fs.writeFileSync(REPORT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), findings }, null, 2));

const blocking = findings.filter((finding) => finding.action === "fail");
if (blocking.length > 0) {
  console.error("Placeholder policy failed:");
  for (const finding of blocking) {
    console.error(`- [${finding.severity}] ${finding.file} ${finding.patternId} (${finding.count})`);
  }
  process.exit(1);
}

if (findings.length > 0) {
  console.warn("Placeholder policy warnings:");
  for (const finding of findings) {
    console.warn(`- [${finding.severity}] ${finding.file} ${finding.patternId} (${finding.count})`);
  }
}
console.log("Placeholder policy check passed.");
