const { spawnSync, execSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
const TIMEOUT_MS = 120000;
const TIMEOUT_COVERAGE_MS = 300000;
const BATCH_SIZE = 20;

// Known slow tests (take >5s) — skipped in quick mode
const SLOW_TESTS = [
  "coverage.test.ts",
  "deep-coverage.test.ts",
  "deep-coverage-commands.test.ts",
  "deep-local-ai.test.ts",
  "deep-commands.test.ts",
  "deep-services.test.ts",
  "deep-utils.test.ts",
  "io-mock-all.test.ts",
  "io-mock-deep.test.ts",
  "runtime.test.ts",
  "orchestration.test.ts",
  "generators.test.ts",
  "simulation-artifacts.test.ts",
  "solution-upgrader.test.ts",
  "token-economy.test.ts",
  "appbuilder.test.ts",
  "collaboration.test.ts",
  "cognitive-coprocessor.test.ts",
  "cli-io.test.ts",
  "audit.test.ts",
  "context-store.test.ts",
  "concurrency-analyzer.test.ts",
  "consistency-engine.test.ts",
  "lightweight-commands.test.ts",
  "local-ai-security.test.ts",
  "init.test.ts",
  "utils-coverage.test.ts"
];

// Known broken tests — always skipped unless --include-broken
const BROKEN_TESTS = [
  "release-preparer.test.ts",
  "acceleration-branch-coverage.test.ts"
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function log(tag, msg) {
  const ts = new Date().toISOString().slice(11, 19);
  console.log(`[${ts}] [${tag}] ${msg}`);
}

function allTests() {
  const result = execSync("npx.cmd jest --listTests", {
    cwd: ROOT,
    encoding: "utf8",
    timeout: 30000
  });
  const rootPrefix = ROOT.replace(/\\/g, "/") + "/";
  return result.trim().split("\n").filter(Boolean).map(f => {
    const fp = f.replace(/\\/g, "/");
    return fp.startsWith(rootPrefix) ? fp.slice(rootPrefix.length) : fp;
  });
}

function filterByDir(files, dir) {
  return files.filter(f => f.includes(dir.replace(/\\/g, "/")));
}

function testName(filepath) {
  return path.basename(filepath);
}

function runJest(files, timeout, coverage) {
  if (files.length === 0) return { status: 0, passed: 0, failed: 0, total: 0 };

  // Split into batches to avoid timeout
  const batches = [];
  for (let i = 0; i < files.length; i += BATCH_SIZE) {
    batches.push(files.slice(i, i + BATCH_SIZE));
  }

  let totalPassed = 0, totalFailed = 0, totalTests = 0, exitCode = 0;
  let combinedOutput = "";

  log("EXEC", `Running ${files.length} file(s) in ${batches.length} batch(es) (timeout: ${(timeout / 1000).toFixed(0)}s each)`);

  for (let b = 0; b < batches.length; b++) {
    const batch = batches[b];
    const args = [
      ...batch,
      "--silent",
      ...(coverage ? ["--coverage", "--coverageReporters=text-summary"] : [])
    ];

    log("BATCH", `Batch ${b + 1}/${batches.length}: ${batch.length} file(s)`);

    const result = spawnSync("npx.cmd", ["jest", ...args], {
      cwd: ROOT,
      encoding: "utf8",
      timeout,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"]
    });

    combinedOutput += (result.stdout || "") + (result.stderr || "");

    const passMatch = combinedOutput.match(/Tests:\s+(\d+) passed/);
    const failMatch = combinedOutput.match(/(\d+) failed/);
    const totalMatch = combinedOutput.match(/(\d+) total/);

    totalPassed += passMatch ? parseInt(passMatch[1]) : 0;
    totalFailed += failMatch ? parseInt(failMatch[1]) : 0;
    totalTests += totalMatch ? parseInt(totalMatch[1]) : 0;

    if (result.status !== 0) exitCode = result.status;
  }

  const coverageMatch = coverage ? combinedOutput.match(/Statements\s*:\s*([\d.]+%)/) : null;

  log("DONE", `passed=${totalPassed} failed=${totalFailed} total=${totalTests}${coverageMatch ? " cov=" + coverageMatch[1] : ""}`);

  if (exitCode !== 0) {
    const failures = combinedOutput.match(/● .+/g) || [];
    failures.slice(0, 5).forEach(f => console.log(`  ${f}`));
  }

  return { status: exitCode, passed: totalPassed, failed: totalFailed, total: totalTests };
}

// ─── Modes ────────────────────────────────────────────────────────────────────
function resolveFiles(mode, target) {
  const all = allTests();
  log("INFO", `Total test files available: ${all.length}`);

  let files;
  if (target) {
    files = all.filter(f => f.includes(target));
    if (files.length === 0) files = [target]; // try as literal path
  } else if (mode === "full") {
    files = all;
  } else if (mode === "acceleration") {
    files = all.filter(f => f.startsWith("scripts/"));
  } else if (mode === "cli") {
    files = all.filter(f => f.startsWith("packages/cli/"));
  } else if (mode === "standard") {
    // standard: all except slow + broken
    files = all.filter(f => !BROKEN_TESTS.some(b => f.endsWith(b)));
    files = files.filter(f => !SLOW_TESTS.some(s => f.endsWith(s)));
  } else if (mode === "unit") {
    // unit: only packages/cli/src/__tests__/* (no scripts/acceleration)
    files = all.filter(f => f.startsWith("packages/cli/"));
    files = files.filter(f => !BROKEN_TESTS.some(b => f.endsWith(b)));
    files = files.filter(f => !SLOW_TESTS.some(s => f.endsWith(s)));
  } else {
    // quick: only fast acceleration + HPC tests (~2 min total)
    files = all.filter(f =>
      f.startsWith("scripts/acceleration/") || f.startsWith("scripts/__tests__/hpc")
    );
  }

  return files;
}

function main() {
  const args = process.argv.slice(2);
  const mode = args.find(a => ["quick", "standard", "full", "acceleration", "cli", "unit"].includes(a)) || "quick";
  const target = args.find(a => a.startsWith("--target="))?.split("=")[1];
  const coverage = args.includes("--coverage");
  const includeBroken = args.includes("--include-broken");
  const verbose = args.includes("--verbose");

  const timeout = coverage ? TIMEOUT_COVERAGE_MS : TIMEOUT_MS;

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  ai-devkit Test Runner v1`);
  console.log(`║  Mode: ${mode}${coverage ? " + --coverage" : ""}${target ? " target=" + target : ""}`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  const allFiles = resolveFiles(mode, target);
  let files = allFiles;

  // Apply skip filters for non-full modes
  if (mode !== "full" && !target) {
    const broken = files.filter(f => BROKEN_TESTS.some(b => f.endsWith(b)));
    if (!includeBroken && broken.length > 0) {
      log("SKIP", `${broken.length} broken test(s) (use --include-broken):`);
      broken.forEach(f => console.log(`    - ${testName(f)}`));
      files = files.filter(f => !BROKEN_TESTS.some(b => f.endsWith(b)));
    }

    if (mode === "quick") {
      const slow = files.filter(f => SLOW_TESTS.some(s => f.endsWith(s)));
      if (slow.length > 0) {
        log("SKIP", `${slow.length} slow test(s) (use --mode=full):`);
        slow.forEach(f => console.log(`    - ${testName(f)}`));
        files = files.filter(f => !SLOW_TESTS.some(s => f.endsWith(s)));
      }
    }
  }

  if (files.length === 0) {
    console.error("No test files matched.");
    process.exit(1);
  }

  log("INFO", `Running ${files.length} file(s)`);
  if (verbose) files.forEach(f => console.log(`    ${f}`));

  const startTime = Date.now();
  const result = runJest(files, timeout, coverage);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  const ok = result.status === 0;

  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  Summary`);
  console.log(`║  Duration: ${elapsed}s`);
  console.log(`║  Mode: ${mode}${coverage ? " + coverage" : ""}`);
  if (result.passed !== undefined) {
    console.log(`║  Tests: ${result.passed} passed, ${result.failed} failed of ${result.total}`);
  }
  console.log(`║  Status: ${ok ? "✅ PASSED" : "❌ FAILED"}`);
  if (ok) {
    console.log(`║  🔹 Modes: quick | standard | full | acceleration | cli | unit`);
    console.log(`║  🔹 Use --target=filename to run a specific file`);
    console.log(`║  🔹 Use --coverage for coverage report`);
    console.log(`║  🔹 Use --include-broken to include known-broken tests`);
  }
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);

  process.exit(ok ? 0 : 1);
}

main();
