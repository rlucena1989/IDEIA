#!/usr/bin/env node
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const ROOT = process.cwd();

function isDevkitRepo(root) {
  return fs.existsSync(path.join(root, "packages/cli/package.json"));
}

function findCliBin(root) {
  const candidates = [
    path.join(root, "packages/cli/dist/index.js"),
    path.join(root, "dist/index.js")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const devkitMode = isDevkitRepo(ROOT);
const cliBin = findCliBin(ROOT);

if (!cliBin) {
  if (devkitMode) {
    console.error("❌ AI-DevKit CLI not found in DevKit repo mode.");
    process.exit(1);
  }
  console.log("⚠️ AI-DevKit CLI not found. Skipping health consistency check in consumer mode.");
  const reportsDir = path.join(ROOT, ".ai/reports");
  if (!fs.existsSync(reportsDir)) fs.mkdirSync(reportsDir, { recursive: true });
  fs.writeFileSync(path.join(reportsDir, "health-consistency-skip.json"), JSON.stringify({
    timestamp: new Date().toISOString(),
    reason: "CLI not found locally",
    skipped: true
  }, null, 2));
  process.exit(0);
}

if (process.env.AI_DEVKIT_NO_RECURSION) {
    console.log("Skipping health consistency check to avoid infinite loop.");
    process.exit(0);
}

console.log("Checking health consistency...");

const statusRes = spawnSync("node", [cliBin, "status"], { cwd: ROOT, encoding: "utf8" });
const verifyRes = spawnSync("node", [cliBin, "verify"], { cwd: ROOT, encoding: "utf8", env: { ...process.env, AI_DEVKIT_NO_RECURSION: "1" } });

const statusFailed = statusRes.status !== 0 || statusRes.stdout.includes("abaixo do nível recomendado");
const verifyPassed = verifyRes.status === 0;

if (statusFailed && verifyPassed) {
  console.error("❌ Health consistency failed: status failed but verify passed.");
  console.error("\n--- status stdout ---");
  console.error(statusRes.stdout);
  console.error("\n--- verify stdout ---");
  console.error(verifyRes.stdout);
  process.exit(1);
}

console.log("Health Consistency check passed.");
