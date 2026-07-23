
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", ".ai/backups", "reports", ".test-gen", "legado", "templates", "runtime", "cache"]);
const IGNORE_FILES = new Set([".gitkeep", "ai-caused-incidents.md", "latest-context.md", "memory-analyzer.test.ts", "solution-upgrader.test.ts"]);
const EXECUTABLE_EXTS = new Set([".js", ".ts", ".sh", ".ps1", ".bat"]);
const DOC_EXTS = new Set([".md", ".yaml", ".yml", ".json"]);

const findings = [];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, "/");
}

function isScriptWithNoBehavior(content) {
  const hasConsole = /console\.(log|warn|error)/.test(content);
  const hasFs = /fs\.|require\(["']fs["']\)|from ["']node:fs["']/.test(content);
  const hasSpawn = /spawnSync|execSync|child_process/.test(content);
  const hasProcessExit = /process\.exit/.test(content);
  const hasArgs = /process\.argv|commander|Command/.test(content);
  const hasExports = /module\.exports|export |export default/.test(content);
  return hasConsole && !hasFs && !hasSpawn && !hasProcessExit && !hasArgs && !hasExports;
}

for (const file of walk(ROOT)) {
  const name = path.basename(file);
  const relative = rel(file);
  if (IGNORE_FILES.has(name)) continue;
  
  const ext = path.extname(file);
  if (!EXECUTABLE_EXTS.has(ext) && !DOC_EXTS.has(ext)) continue;
  
  let content;
  try { content = fs.readFileSync(file, "utf8").trim(); } catch { continue; }
  if (content.length < 20) {
    findings.push({ file: relative, issue: "File is too small to provide real value" });
    continue;
  }
  
  if (ext === ".md") {
    const lines = content.split(/\r?\n/).filter((line) => line.trim());
    const nonHeading = lines.filter((line) => !line.trim().startsWith("#"));
    if (nonHeading.length === 0) {
      findings.push({ file: relative, issue: "Markdown contains only headings — no real content" });
    }
  }
  
  if (EXECUTABLE_EXTS.has(ext) && isScriptWithNoBehavior(content)) {
    findings.push({ file: relative, issue: "Executable file appears to only print messages without real behavior" });
  }
}

if (findings.length > 0) {
  console.error("Empty/decorative files check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.file}: ${finding.issue}`);
  }
  process.exit(1);
}
console.log("Empty/decorative files check passed.");
