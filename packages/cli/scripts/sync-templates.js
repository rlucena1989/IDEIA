
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "../../..");
const sourceAi = path.join(root, ".ai");
const targetAi = path.resolve(__dirname, "../templates/.ai");

if (!fs.existsSync(sourceAi)) {
  console.error(`[sync-templates] Source .ai not found: ${sourceAi}`);
  process.exit(1);
}

if (!fs.existsSync(path.join(sourceAi, "project-manifest.yaml"))) {
  console.error(`[sync-templates] Invalid source .ai: ${sourceAi}`);
  process.exit(1);
}

fs.rmSync(targetAi, { recursive: true, force: true });
fs.mkdirSync(path.dirname(targetAi), { recursive: true });
fs.cpSync(sourceAi, targetAi, { recursive: true });
console.log(`[sync-templates] Synced ${sourceAi} -> ${targetAi}`);
