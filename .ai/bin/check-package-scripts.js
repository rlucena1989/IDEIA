
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

const PACKAGE_FILES = [
  "package.json",
  "packages/cli/package.json",
  "packages/core/package.json"
];

const CRITICAL_SCRIPT_NAMES = [
  "build", "test", "verify", "audit", "prove",
  "ai:verify", "ai:audit", "ai:quality:gate", "ai:prevention"
];

const findings = [];

function checkPackage(pkgPath) {
  const full = path.join(ROOT, pkgPath);
  if (!fs.existsSync(full)) return;
  
  const pkg = JSON.parse(fs.readFileSync(full, "utf8"));
  const scripts = pkg.scripts || {};
  const pkgDir = path.dirname(full);
  
  for (const [name, command] of Object.entries(scripts)) {
    const nodeRefs = [...command.matchAll(/\bnode\s+([^\s&|]+\.js)\b/g)];
    for (const match of nodeRefs) {
      const ref = match[1];
      const fromPkg = path.resolve(pkgDir, ref);
      const fromRoot = path.resolve(ROOT, ref);
      if (!fs.existsSync(fromPkg) && !fs.existsSync(fromRoot)) {
        findings.push({
          package: pkgPath,
          script: name,
          command,
          issue: "Script references non-existent file: " + ref
        });
      }
    }
    
    if (command.includes("|| true")) {
      const critical = CRITICAL_SCRIPT_NAMES.some((token) => name.includes(token));
      findings.push({
        package: pkgPath,
        script: name,
        command,
        issue: critical ? "Critical script masks failure with || true" : "Script uses || true and must justify why it is optional"
      });
    }
  }
}

for (const pkgPath of PACKAGE_FILES) {
  checkPackage(pkgPath);
}

if (findings.length > 0) {
  console.error("Package scripts check failed:");
  for (const finding of findings) {
    console.error(`- ${finding.package} -> ${finding.script}: ${finding.issue}`);
    console.error(`  ${finding.command}`);
  }
  process.exit(1);
}
console.log("Package scripts check passed.");
