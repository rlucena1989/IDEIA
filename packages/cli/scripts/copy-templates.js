const fs = require("fs");
const path = require("path");

const cliRoot = path.resolve(__dirname, "..");
const packageRoot = path.resolve(cliRoot, "../..");
const workspaceRoot = path.resolve(cliRoot, "../../..");

const candidates = [
  path.join(cliRoot, "templates"),
  path.join(packageRoot, ".ai"),
  path.join(workspaceRoot, ".ai")
];

function hasAiTemplate(candidate) {
  if (!fs.existsSync(candidate)) return false;
  if (path.basename(candidate) === ".ai") {
    return fs.existsSync(path.join(candidate, "project-manifest.yaml"));
  }
  return fs.existsSync(path.join(candidate, ".ai", "project-manifest.yaml"));
}

const source = candidates.find(hasAiTemplate);

if (!source) {
  console.error("[copy-templates] No valid template source found.");
  console.error("[copy-templates] Checked:");
  for (const candidate of candidates) {
    console.error(`- ${candidate}`);
  }
  process.exit(1);
}

const distRoot = path.join(cliRoot, "dist");
const targetTemplates = path.join(distRoot, "templates");

fs.mkdirSync(distRoot, { recursive: true });

function safeCopyDir(src, dest) {
  // Windows-safe recursive copy: remove dest first if exists, then copy
  if (fs.existsSync(dest)) {
    try {
      fs.rmSync(dest, { recursive: true, force: true });
    } catch {
      // Fallback: remove individual files recursively
      try {
        const entries = fs.readdirSync(dest);
        for (const e of entries) {
          fs.rmSync(path.join(dest, e), { recursive: true, force: true });
        }
        fs.rmSync(dest, { recursive: true, force: true });
      } catch {}
    }
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  try {
    fs.cpSync(src, dest, { recursive: true, force: true });
  } catch (cpErr) {
    // Ultimate fallback: manual copy file-by-file
    console.error(`[copy-templates] cpSync failed, falling back to manual copy: ${cpErr.message}`);
    copyRecursive(src, dest);
  }
}

function copyRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

if (path.basename(source) === ".ai") {
  const targetAi = path.join(targetTemplates, ".ai");
  safeCopyDir(source, targetAi);
  console.log(`[copy-templates] Copied ${source} -> ${targetAi}`);
} else {
  safeCopyDir(source, targetTemplates);
  console.log(`[copy-templates] Copied ${source} -> ${targetTemplates}`);
}
