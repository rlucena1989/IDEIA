#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function detectTaskType(input) {
  const text = `${input.summary || ''} ${input.details || ''}`.toLowerCase();
  if (input.task_hint) return input.task_hint;
  if (text.includes('document')) return 'documentation';
  if (text.includes('test')) return 'test_only';
  if (text.includes('security') || text.includes('auth')) return 'security_review';
  if (text.includes('design') || text.includes('ui') || text.includes('button') || text.includes('card')) return 'design_change';
  if (text.includes('refactor')) return 'refactor';
  if (text.includes('dependency')) return 'dependency_update';
  if (text.includes('cleanup')) return 'cleanup';
  if (text.includes('incident') || text.includes('outage')) return 'incident_response';
  if (text.includes('feature')) return 'feature';
  return 'bugfix';
}

function estimateRisk(taskType, files, details, memoryHits) {
  let score = 10;
  const sensitive = ['.ai/', 'package.json', 'pnpm-lock.yaml', 'package-lock.json', 'yarn.lock', 'tsconfig', 'next.config', '.env'];

  if (files.some((f) => sensitive.some((s) => f.includes(s)))) score += 20;
  if (files.length > 1) score += 10;
  if (files.length > 5) score += 10;
  if ((details || '').toLowerCase().includes('auth')) score += 30;
  if (taskType === 'incident_response') score += 50;
  if (taskType === 'security_review') score += 35;
  if (taskType === 'feature') score += 15;
  if (taskType === 'refactor') score += 10;
  if ((memoryHits?.incidents || []).length > 0) score += 10;

  const level = score >= 85 ? 'critical' : score >= 60 ? 'high' : score >= 30 ? 'medium' : 'low';
  return { score: Math.min(100, score), level };
}

function main() {
  if (process.argv.length < 3) { console.log('OK - no input'); process.exit(0); }
  const requestPath = process.argv[2];
  if (!requestPath) {
    console.error('Usage: analyze-impact.js <request.json>');
    console.log('EXIT_CODE=1');
    process.exit(1);
  }

  const root = process.cwd();
  const input = JSON.parse(fs.readFileSync(path.resolve(root, requestPath), 'utf8'));
  const files = Array.isArray(input.files) ? input.files : [];
  const taskType = detectTaskType(input);

  const memoryPath = path.join(root, '.ai/optimizer/runtime/latest-memory.json');
  const memoryHits = fs.existsSync(memoryPath)
    ? JSON.parse(fs.readFileSync(memoryPath, 'utf8'))
    : { patterns: [], decisions: [], incidents: [] };

  const risk = estimateRisk(taskType, files, input.details, memoryHits);

  const mapping = {
    bugfix: { context_profile: 'bugfix', execution_mode: 'patch', recommended_agents: ['tester', 'reviewer'], estimated_scope: 'small' },
    feature: { context_profile: 'feature', execution_mode: 'task_graph', recommended_agents: ['architect', 'frontend', 'tester', 'reviewer'], estimated_scope: 'medium' },
    refactor: { context_profile: 'refactor', execution_mode: 'patch', recommended_agents: ['architect', 'reviewer'], estimated_scope: 'small' },
    documentation: { context_profile: 'docs', execution_mode: 'patch', recommended_agents: ['docs', 'reviewer'], estimated_scope: 'small' },
    design_change: { context_profile: 'ui-change', execution_mode: 'patch', recommended_agents: ['frontend', 'reviewer'], estimated_scope: 'small' },
    security_review: { context_profile: 'security-review', execution_mode: 'audit', recommended_agents: ['security', 'reviewer'], estimated_scope: 'medium' },
    test_only: { context_profile: 'bugfix', execution_mode: 'patch', recommended_agents: ['tester'], estimated_scope: 'small' },
    dependency_update: { context_profile: 'feature', execution_mode: 'controlled', recommended_agents: ['tester', 'security', 'reviewer'], estimated_scope: 'small' },
    cleanup: { context_profile: 'refactor', execution_mode: 'patch', recommended_agents: ['reviewer'], estimated_scope: 'small' },
    incident_response: { context_profile: 'forensic', execution_mode: 'task_graph', recommended_agents: ['architect', 'security', 'tester', 'reviewer'], estimated_scope: 'large' }
  };

  const decision = {
    task_type: taskType,
    requires_ai: true,
    recommended_agents: mapping[taskType].recommended_agents,
    context_profile: mapping[taskType].context_profile,
    execution_mode: mapping[taskType].execution_mode,
    risk_level: risk.level,
    risk_score: risk.score,
    estimated_scope: mapping[taskType].estimated_scope,
    memory_hits: {
      patterns: memoryHits.patterns?.length || 0,
      decisions: memoryHits.decisions?.length || 0,
      incidents: memoryHits.incidents?.length || 0
    },
    request_hash: `sha256:${hash(JSON.stringify(input))}`
  };

  const outDir = path.join(root, '.ai/optimizer/runtime');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'latest-decision.json'), JSON.stringify(decision, null, 2), 'utf8');

  console.log(JSON.stringify(decision, null, 2));
  console.log('EXIT_CODE=0');
  process.exit(0);
}

main();
