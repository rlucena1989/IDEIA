#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const TASK_TYPES = [
  "bugfix", "feature", "refactor", "documentation", "design_change",
  "security_review", "test_only", "dependency_update", "cleanup", "incident_response",
];

function loadRequest(file) {
  const raw = fs.readFileSync(file, "utf8");
  return JSON.parse(raw);
}

function classify(request) {
  if (request.task_hint && TASK_TYPES.includes(request.task_hint)) {
    return {
      task_type: request.task_hint,
      confidence: 1.0,
      method: "explicit",
      recommended_pipeline: getPipeline(request.task_hint),
    };
  }

  const text = [request.summary || "", request.details || "", ...(request.files || [])].join(" ").toLowerCase();

  const keywords = {
    bugfix: ["bug", "error", "fix", "crash", "incorrect", "wrong", "fail", "broken", "issue"],
    feature: ["feature", "add", "new", "implement", "create", "support", "allow"],
    refactor: ["refactor", "rename", "extract", "move", "reorganize", "clean up", "simplify"],
    documentation: ["doc", "readme", "comment", "documentation", "docs", "markdown"],
    design_change: ["ui", "design", "style", "layout", "css", "component", "visual", "frontend"],
    security_review: ["security", "vulnerability", "cve", "auth", "permission", "password", "secret"],
    test_only: ["test", "spec", "coverage", "jest", "assert"],
    dependency_update: ["depend", "update", "version", "upgrade", "downgrade", "package"],
    cleanup: ["cleanup", "remove", "delete", "unused", "dead code", "legacy"],
    incident_response: ["incident", "outage", "down", "critical", "emergency", "urgent", "p0"],
  };

  let bestType = "bugfix";
  let bestScore = 0;

  for (const [type, kws] of Object.entries(keywords)) {
    const score = kws.filter((kw) => text.includes(kw)).length / kws.length;
    if (score > bestScore) {
      bestScore = score;
      bestType = type;
    }
  }

  return {
    task_type: bestType,
    confidence: Math.min(1, Math.round(bestScore * 10) / 10 + 0.3),
    method: "keyword",
    recommended_pipeline: getPipeline(bestType),
  };
}

function getPipeline(taskType) {
  const pipelines = {
    bugfix: ["validate", "minimize-context", "generate-patch", "score-quality", "apply"],
    feature: ["validate", "analyze-impact", "get-memory", "minimize-context", "generate", "score-quality", "score-risk", "apply"],
    refactor: ["validate", "analyze-impact", "get-memory", "minimize-context", "generate-patch", "score-quality", "score-risk", "apply"],
    documentation: ["validate", "minimize-context", "generate-patch", "apply"],
    design_change: ["validate", "minimize-context", "generate-patch", "score-quality", "apply"],
    security_review: ["validate", "analyze-impact", "get-memory", "forensic-context", "generate-patch", "score-quality", "score-risk", "apply"],
    test_only: ["validate", "minimize-context", "generate-patch", "apply"],
    dependency_update: ["validate", "analyze-impact", "get-memory", "generate-patch", "score-risk", "apply"],
    cleanup: ["validate", "minimize-context", "generate-patch", "apply"],
    incident_response: ["validate", "analyze-impact", "get-memory", "forensic-context", "generate-patch", "score-quality", "score-risk", "apply"],
  };
  return pipelines[taskType] || pipelines.bugfix;
}

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const input = process.argv[2];
  if (!input) {
    console.error("Usage: classify-task.js <request.json>");
    process.exit(1);
  }

  const request = loadRequest(path.resolve(process.cwd(), input));
  const result = classify(request);

  const outDir = path.join(process.cwd(), ".ai/optimizer/runtime");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "latest-classification.json"), JSON.stringify(result, null, 2));

  console.log(JSON.stringify(result, null, 2));
  console.log("EXIT_CODE=0");
  process.exit(0);
}

main();
