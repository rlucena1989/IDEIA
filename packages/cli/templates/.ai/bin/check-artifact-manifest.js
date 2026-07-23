
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

const manifestPath = path.join(ROOT, ".ai/audit/artifact-manifest.json");

if (!fs.existsSync(manifestPath)) {
    console.warn("No artifact-manifest.json found, skipping check.");
    process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
let failed = false;

for (const artifact of manifest.artifacts || []) {
    const fullPath = path.join(ROOT, artifact.path);
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Artifact missing: ${artifact.path}`);
        failed = true;
    } else {
        if (fs.statSync(fullPath).size === 0) {
            console.error(`❌ Artifact empty: ${artifact.path}`);
            failed = true;
        }
    }
}

if (failed) {
    console.error("Artifact manifest check failed.");
    process.exit(1);
}
console.log("Artifact manifest check passed.");
