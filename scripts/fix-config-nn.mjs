import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(import.meta.dirname, '..');
const stripBOM = s => s.replace(/^\uFEFF/, '');
const read = p => stripBOM(readFileSync(resolve(ROOT, p), 'utf8'));
const write = (p, c) => writeFileSync(resolve(ROOT, p), c, 'utf8');

let totalFixed = 0;

const fixes = [
  // project-lifecycle-orchestrator.ts (remaining after Map.get fix)
  { file: 'packages/cli/src/lifecycle/project-lifecycle-orchestrator.ts', patterns: [
    [/this\.config\.maxRetries!/g, 'this.config.maxRetries ?? 3'],
    [/this\.config\.coverageThreshold!/g, 'this.config.coverageThreshold ?? 80'],
    [/this\.config\.analysisDepth!/g, 'this.config.analysisDepth ?? 3'],
    [/this\.config\.maxSuggestions!/g, 'this.config.maxSuggestions ?? 5'],
    [/this\.config\.phaseTimeoutMs!/g, 'this.config.phaseTimeoutMs ?? 300000'],
  ]},
  // duplication.ts
  { file: 'packages/cli/src/runtime/duplication.ts', patterns: [
    [/this\.config\.threshold!/g, 'this.config.threshold ?? 0.8'],
    [/this\.config\.maxResults!/g, 'this.config.maxResults ?? 10'],
    [/this\.config\.minTokens!/g, 'this.config.minTokens ?? 50'],
  ]},
  // vector-search.ts
  { file: 'packages/memory-store/src/vector-search.ts', patterns: [
    [/this\.config\.topK!/g, 'this.config.topK ?? 10'],
    [/this\.config\.minScore!/g, 'this.config.minScore ?? 0.5'],
    [/this\.config\.enableReranking!/g, 'this.config.enableReranking ?? false'],
  ]},
  // cag-cache.ts
  { file: 'packages/memory-store/src/cag-cache.ts', patterns: [
    [/this\.config\.maxEntries!/g, 'this.config.maxEntries ?? 1000'],
    [/this\.config\.ttlMs!/g, 'this.config.ttlMs ?? 3600000'],
    [/this\.config\.cleanupIntervalMs!/g, 'this.config.cleanupIntervalMs ?? 60000'],
  ]},
  // observability-engine.ts
  { file: 'packages/observability-engine/src/observability-engine.ts', patterns: [
    [/this\.config\.serviceName!/g, "this.config.serviceName ?? 'unknown'"],
    [/this\.config\.samplingRate!/g, 'this.config.samplingRate ?? 1.0'],
    [/this\.config\.enableTracing!/g, 'this.config.enableTracing ?? true'],
  ]},
  // coverage-improve.ts
  { file: 'packages/cli/src/commands/coverage-improve.ts', patterns: [
    [/this\.config\.minCoverage!/g, 'this.config.minCoverage ?? 80'],
    [/this\.config\.failOnLowCoverage!/g, 'this.config.failOnLowCoverage ?? true'],
  ]},
  // coverage.ts
  { file: 'packages/cli/src/commands/coverage.ts', patterns: [
    [/config\.minCoverage!/g, 'config.minCoverage ?? 80'],
    [/config\.failOnLowCoverage!/g, 'config.failOnLowCoverage ?? true'],
  ]},
  // collaboration.ts
  { file: 'packages/cli/src/local-ai/collaboration.ts', patterns: [
    [/this\.config\.maxParticipants!/g, 'this.config.maxParticipants ?? 8'],
    [/this\.config\.timeoutMs!/g, 'this.config.timeoutMs ?? 300000'],
  ]},
  // classifier.ts
  { file: 'packages/cli/src/runtime/classifier.ts', patterns: [
    [/this\.config\.minConfidence!/g, 'this.config.minConfidence ?? 0.6'],
    [/this\.config\.enableFallback!/g, 'this.config.enableFallback ?? true'],
  ]},
  // chat.ts
  { file: 'packages/cli/src/local-ai/chat.ts', patterns: [
    [/this\.config\.maxHistory!/g, 'this.config.maxHistory ?? 50'],
    [/this\.config\.systemPrompt!/g, "this.config.systemPrompt ?? 'You are a helpful assistant'"],
  ]},
  // api-router.ts
  { file: 'packages/cli/src/ide/api-router.ts', patterns: [
    [/this\.config\.port!/g, 'this.config.port ?? 3030'],
    [/this\.config\.host!/g, "this.config.host ?? 'localhost'"],
  ]},
];

for (const fix of fixes) {
  try {
    let content = read(fix.file);
    const original = content;
    let fileFixed = 0;
    
    for (const [regex, replacement] of fix.patterns) {
      const before = content;
      content = content.replace(regex, replacement);
      if (content !== before) fileFixed++;
    }
    
    if (fileFixed > 0) {
      write(fix.file, content);
      totalFixed += fileFixed;
      console.log(`  ${fix.file}: ${fileFixed} fixed`);
    }
  } catch (e) {
    console.log(`  ${fix.file}: ERROR - ${e.message.slice(0, 50)}`);
  }
}

console.log(`\n✅ Total: ${totalFixed} config! assertions fixed`);
