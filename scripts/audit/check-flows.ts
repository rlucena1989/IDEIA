import fs from 'node:fs';
import path from 'node:path';

interface FlowCheck {
  name: string;
  keywords: string[];
  found: boolean;
}

const criticalFlows: FlowCheck[] = [
  { name: 'bootstrap', keywords: ['Bootstrap', 'bootstrap', 'createDevkit'], found: false },
  { name: 'stack-detection', keywords: ['StackDetector', 'stackDetector', 'detectStack', 'StackInfo'], found: false },
  { name: 'token-economy', keywords: ['TokenEconomy', 'tokenEconomy', 'TokenEconomyEngine', 'token-economy'], found: false },
  { name: 'pattern-detection', keywords: ['PatternDetector', 'PatternRegistry', 'patternRegistry', 'PatternObserver'], found: false },
  { name: 'pipeline-orchestration', keywords: ['PipelineOrchestrator', 'pipeline-orchestrator', 'PipelineStage', 'PipelineConfig', 'PipelineReport'], found: false },
  { name: 'quality-gate', keywords: ['verify', 'gate', 'QualityGate', 'GateRunner', 'runPipeline'], found: false },
  { name: 'audit-ledger', keywords: ['AuditLedger', 'auditLedger', 'ledger', 'TimelineEntry', 'attest'], found: false },
  { name: 'persistence', keywords: ['persist', 'flush', 'hydrate', 'TokenEconomyPersistence', 'Checkpoint', 'saveCheckpoint'], found: false },
];

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith('node_modules') && !entry.name.startsWith('dist') && !entry.name.startsWith('coverage')) {
        walk(full, files);
      }
    } else if (entry.isFile() && full.endsWith('.ts')) {
      files.push(full);
    }
  }
  return files;
}

const files = walk('packages');
for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const flow of criticalFlows) {
    if (!flow.found) {
      flow.found = flow.keywords.some((kw) => content.includes(kw));
    }
  }
}

let failed = false;
for (const flow of criticalFlows) {
  const status = flow.found ? 'FOUND' : 'MISSING';
  if (!flow.found) {
    console.error(`[check-flows] Critical flow not found: ${flow.name}`);
    failed = true;
  } else {
    console.log(`[check-flows] ${status}: ${flow.name}`);
  }
}

console.log(`[check-flows] ${criticalFlows.filter((f) => f.found).length}/${criticalFlows.length} critical flows validated`);
if (failed) process.exit(1);
console.log('[check-flows] All critical flows present');