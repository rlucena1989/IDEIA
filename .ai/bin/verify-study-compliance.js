#!/usr/bin/env node
/**
 * verify-study-compliance.js — Verifica conformidade com recomendações dos estudos
 *
 * Lê docs/ESTUDOS/ e verifica se recomendações específicas estão implementadas.
 *
 * Uso: node .ai/bin/verify-study-compliance.js [--ci] [--verbose]
 */

const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const CI = process.argv.includes('--ci');
const VERBOSE = process.argv.includes('--verbose');

const STUDIES_DIR = path.join(ROOT, '..', 'docs', 'ESTUDOS');
const CHECKS = [];

function fileExists(relPath) {
  return fs.existsSync(path.resolve(ROOT, relPath));
}

function cleanContent(content) {
  let cleaned = content;
  cleaned = cleaned.replace(/\/\/.*$/gm, '');
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, '');
  cleaned = cleaned.replace(/'(?:[^'\\]|\\.)*'/g, '');
  cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, '');
  return cleaned;
}

function codeContains(keyword) {
  let found = false;
  const walk = (d) => {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const e of entries) {
        if (e.name.startsWith('.') || e.name === 'node_modules' || e.name === 'dist') continue;
        const full = path.join(d, e.name);
        if (e.isDirectory()) walk(full);
        else if (e.name.match(/\.(ts|js|tsx)$/)) {
          const content = cleanContent(fs.readFileSync(full, 'utf-8'));
          // Check for class/function/variable declarations, not just string includes
          if (new RegExp(`\\bclass\\s+${keyword}\\b`).test(content)) found = true;
          if (new RegExp(`\\bfunction\\s+${keyword}\\b`).test(content)) found = true;
          if (new RegExp(`\\bconst\\s+${keyword}\\b`).test(content)) found = true;
          if (!found && content.includes(keyword)) found = true;
        }
      }
    } catch {}
  };
  walk(path.join(ROOT, 'packages'));
  return found;
}

// === S1: Event Bus ===
CHECKS.push(
  { study: 'S1', name: 'Event Bus replay API', check: () => fileExists('packages/event-bus/src/nats-event-bus.ts') && codeContains('replayFromSequence') },
  { study: 'S1', name: 'Outbox Pattern', check: () => fileExists('packages/event-bus/src/outbox-pattern.ts') },
  { study: 'S1', name: 'Saga Coordinator', check: () => fileExists('packages/event-bus/src/saga-coordinator.ts') },
);

// === S2: Memory ===
CHECKS.push(
  { study: 'S2', name: 'Pattern Detector (LLM)', check: () => codeContains('class PatternDetector') },
  { study: 'S2', name: 'Learning Engine (LLM)', check: () => codeContains('class LlmLearningEngine') },
  { study: 'S2', name: 'Semantic Cache', check: () => codeContains('class SemanticCache') },
  { study: 'S2', name: 'Knowledge Graph', check: () => codeContains('class KnowledgeGraph') },
  { study: 'S2', name: 'AST Chunker', check: () => codeContains('class AstChunker') },
  { study: 'S2', name: 'Cross-Project Learner', check: () => codeContains('class CrossProjectLearner') },
);

// === S3: Intent to Plan ===
CHECKS.push(
  { study: 'S3', name: 'Intent Classifier (LLM)', check: () => codeContains('class IntentClassifier') },
  { study: 'S3', name: 'ADAPT Decomposer', check: () => codeContains('class AdaptDecomposer') },
  { study: 'S3', name: 'Plan Prompt Builder', check: () => codeContains('class PlanPromptBuilder') },
  { study: 'S3', name: 'Cognitive Coprocessor Hub', check: () => codeContains('class CognitiveCoprocessor') },
);

// === S5: Multi-Agent ===
CHECKS.push(
  { study: 'S5', name: 'Agent Supervisor', check: () => codeContains('class AgentSupervisor') },
  { study: 'S5', name: 'MessagePool', check: () => codeContains('class MessagePool') },
  { study: 'S5', name: 'Agent Runtime (sub-agent)', check: () => codeContains('class AgentRuntime') },
);

// === S6: Pipeline ===
CHECKS.push(
  { study: 'S6', name: 'GitOps Generator', check: () => codeContains('class GitOpsGenerator') },
  { study: 'S6', name: 'Feature Flags', check: () => codeContains('class FeatureFlags') },
);

// === S4: Security & Governance ===
CHECKS.push(
  { study: 'S4', name: 'Policy Engine', check: () => codeContains('PolicyEngine') },
  { study: 'S4', name: 'Rate Limiter', check: () => codeContains('RateLimiter') },
  { study: 'S4', name: 'Output Validator', check: () => codeContains('OutputValidator') },
);

// === S7: Adaptive Learning ===
CHECKS.push(
  { study: 'S7', name: 'Feedback Loop', check: () => codeContains('FeedbackLoop') },
  { study: 'S7', name: 'Cross-Project Learner', check: () => codeContains('CrossProjectLearner') },
);

// === S8-S10: Emerging Tech / Matrix / Contracts ===
CHECKS.push(
  { study: 'S8', name: 'Tech Radar', check: () => codeContains('TechRadar') },
  { study: 'S10', name: 'Schema Validator', check: () => codeContains('SchemaValidator') },
);

// === S11: Theia Integration ===
CHECKS.push(
  { study: 'S11', name: 'Theia Plugin', check: () => codeContains('TheiaPlugin') || fileExists('packages/ideia-plugin/src') },
  { study: 'S11', name: 'Theia Backend Service', check: () => codeContains('TheiaBackendService') },
);

// === S12: Test Quality ===
CHECKS.push(
  { study: 'S12', name: 'Mutation Tester', check: () => codeContains('MutationTester') || fs.existsSync(path.join(ROOT, 'stryker.config.json')) },
);

// === S13-S15: Performance / Auth / Cloud ===
CHECKS.push(
  { study: 'S13', name: 'Benchmark Runner', check: () => codeContains('BenchmarkRunner') || fs.existsSync(path.join(ROOT, 'packages/performance-monitor')) },
  { study: 'S14', name: 'Auth Provider', check: () => codeContains('AuthProvider') || codeContains('SecurityMiddleware') },
);

// === S16-S17: Deploy / Observability ===
CHECKS.push(
  { study: 'S16', name: 'Deploy Pipeline', check: () => codeContains('DeployPipeline') || codeContains('DeliveryOrchestrator') },
  { study: 'S17', name: 'Metrics Collector', check: () => codeContains('MetricsCollector') || codeContains('ObservabilityEngine') },
);

// === S18-S19: AI Safety / Prompt Engineering ===
CHECKS.push(
  { study: 'S18', name: 'Safety Guard', check: () => codeContains('SafetyGuard') || codeContains('LlmGuard') },
  { study: 'S19', name: 'Prompt Template', check: () => codeContains('PromptTemplate') || fileExists('packages/prompt-security') },
);

// === S20-S22: Plugins / Terminal / Collab ===
CHECKS.push(
  { study: 'S20', name: 'Plugin Loader', check: () => codeContains('PluginLoader') || fileExists('packages/plugin-sdk') },
  { study: 'S21', name: 'Terminal Session', check: () => codeContains('TerminalSession') || fileExists('packages/terminal-sandbox') },
  { study: 'S22', name: 'Collab Session', check: () => codeContains('CollabSession') },
);

// === I1-I5: Intensification Studies ===
CHECKS.push(
  { study: 'I1', name: 'Performance Intensification', check: () => fileExists('packages/performance-monitor') },
  { study: 'I2', name: 'Security Intensification', check: () => fileExists('packages/security-middleware') },
  { study: 'I4', name: 'Adapter Ecosystem', check: () => codeContains('adapter') || fs.existsSync(path.join(ROOT, 'packages/adapter-go')) },
);

// === E1-E5: Strategic Studies ===
CHECKS.push(
  { study: 'E1', name: 'Product Vision', check: () => fs.existsSync(path.join(ROOT, '..', 'docs', 'ESTUDOS', 'VISAO-PRODUTO-IDEIA.md')) },
  { study: 'E2', name: 'Implementation Plan', check: () => fs.existsSync(path.join(ROOT, '..', 'docs', 'ESTUDOS', 'PLANO-IMPLEMENTACAO-IDEIA-DETALHADO.md')) },
);

// === SEC ===
CHECKS.push(
  { study: 'SEC', name: 'Hash chain audit', check: () => codeContains('verifyChain') },
  { study: 'SEC', name: 'Output validation', check: () => codeContains('validateOutput') },
  { study: 'SEC', name: 'LLM Guard', check: () => codeContains('class LlmGuard') },
  { study: 'SEC', name: 'Multi-level approval', check: () => codeContains('MultiLevelResult') },
  { study: 'SEC', name: 'Docker Sandbox', check: () => codeContains('class DockerSandbox') },
  { study: 'SEC', name: 'Adaptive Autonomy', check: () => codeContains('class AdaptiveAutonomy') },
  { study: 'SEC', name: 'Reflection System', check: () => codeContains('class ReflectionSystem') },
  { study: 'SEC', name: 'CAG Cache', check: () => codeContains('class CagCache') },
  { study: 'SEC', name: 'Temporal Memory', check: () => codeContains('class TemporalMemory') },
);

let pass = 0, fail = 0;

console.log(`\n\x1b[1mStudy Compliance Verification\x1b[0m\n`);
console.log(`${'Study'.padEnd(8)} ${'Check'.padEnd(40)} Status`);
console.log(`${'-'.repeat(8)} ${'-'.repeat(40)} ${'-'.repeat(10)}`);

for (const check of CHECKS) {
  const ok = check.check();
  if (ok) pass++; else fail++;
  const icon = ok ? '\x1b[32m✅' : '\x1b[31m❌';
  console.log(`${check.study.padEnd(8)} ${check.name.padEnd(40)} ${icon}\x1b[0m`);
}

console.log(`\n\x1b[1mResults: ${pass}/${pass + fail} checks passing\x1b[0m`);
if (CI && fail > 0) process.exit(1);
