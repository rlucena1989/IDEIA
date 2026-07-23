
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

const RISKS = [
  { id: "bypass", regex: /PENDING_ACTION:\s*bypass/g },
  { id: "eslint-disable", regex: /eslint-disable-next-line(?!.*justificativa)/g },
  { id: "ts-ignore", regex: /@ts-ignore(?!.*justificativa)/g },
  { id: "hidden-fail", regex: /\|\|\s*true/g },
  { id: "skip-test", regex: /\.(skip|todo)\(/g }
];

const IGNORE_DIRS = new Set(["node_modules", ".git", "dist", "coverage", "legado"]);

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, files);
    } else if (entry.name.endsWith('.js') || entry.name.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

let failures = [];
for (const file of walk(path.join(ROOT, 'src'))) { // Only scan src/ for generated code risks
  const content = fs.readFileSync(file, "utf8");
  for (const rule of RISKS) {
    const matches = content.match(rule.regex);
    if (matches) {
      failures.push({ rule: rule.id, file: path.relative(ROOT, file) });
    }
  }
}

if (failures.length > 0) {
  console.error("Generated Code Risk check failed:");
  failures.forEach(f => console.error(`- [${f.rule}] in ${f.file}`));
  process.exit(1);
}
console.log("Generated Code Risk check passed.");
