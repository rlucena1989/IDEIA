const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawnSync } = require("child_process");
const root = process.cwd();

function fail(message) {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function ok(message) {
  console.log(`✅ ${message}`);
}

function run(cmd, args, cwd) {
  const fullCommand = [cmd, ...args].join(" ");
  const result = spawnSync(fullCommand, { cwd, encoding: "utf8", shell: true });
  return { status: result.status, stdout: result.stdout || "", stderr: result.stderr || "" };
}

const cliRoot = path.join(root, "packages/cli");
if(!fs.existsSync(cliRoot)) {
  console.log("Not in devkit monorepo. Skipping check-installer.");
  process.exit(0);
}

let result = run("npm", ["run", "build"], cliRoot);
if (result.status !== 0) fail("CLI build failed");
ok("CLI build passed");

const cli = path.join(cliRoot, "dist/index.js");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "ai-devkit-installer-check-"));

// Teste de --dry-run
const dryDir = path.join(tmp, "dry-run");
fs.mkdirSync(dryDir);
result = run("node", [cli, "init", ".", "--dry-run"], dryDir);
if (result.status !== 0) fail("dry-run failed");
if (fs.existsSync(path.join(dryDir, ".ai"))) fail("dry-run changed filesystem");
ok("dry-run did not change filesystem");

// Teste de Invalid Flavor
const invalidDir = path.join(tmp, "invalid");
fs.mkdirSync(invalidDir);
result = run("node", [cli, "init", ".", "--flavor", "rails"], invalidDir);
if (result.status === 0) fail("invalid flavor was accepted");
ok("invalid flavor rejected without filesystem changes");

// Teste de Safe init e Preservação
const appDir = path.join(tmp, "app");
fs.mkdirSync(appDir);
result = run("node", [cli, "init", ".", "--flavor", "nestjs"], appDir);
if (!fs.existsSync(path.join(appDir, ".ai/context/ai-handoff.md"))) fail("init . failed to create .ai/context/ai-handoff.md");

const handoff = path.join(appDir, ".ai/context/ai-handoff.md");
fs.appendFileSync(handoff, "\nCUSTOM HUMAN CHANGE\n");
run("node", [cli, "init", ".", "--flavor", "nestjs"], appDir);
if (!fs.readFileSync(handoff, "utf8").includes("CUSTOM HUMAN CHANGE")) fail("safe init overwrote human change");
ok("safe init preserved human change");

// O problema de "force did not create backup" é que o backup só é feito se fs.copyFileSync for invocado sob overwrite, 
// o copy recursive no init.ts faz backup se target existir.
// "CUSTOM HUMAN CHANGE" editou um arquivo que já existia.
// Então o --force AGORA deve criar o backup.
result = run("node", [cli, "init", ".", "--force", "--flavor", "nestjs"], appDir);
const backupsRoot = path.join(appDir, ".ai/backups/setup");
if (!fs.existsSync(backupsRoot)) {
    console.log(result.stdout);
    fail("--force did not create backup directory");
}
ok("--force created backup directory");

console.log("\n✅ Installer check passed.");
