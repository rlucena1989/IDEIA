#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

// Auto-generated migration script for process.env to ConfigManager
// Generated: 2026-07-27T05:05:30.922Z

const filesToMigrate = [
  'incident-manager/src/incident-notifier.ts',
  'event-bus/src/nats-config.ts',
  'human-gate-pipeline/src/human-approval-gate.ts',
  'llm-provider/src/index.ts',
  'acceleration/src/config.ts',
  'code-signing/src/code-sign-pipeline.ts',
  'cli/src/local-ai/providers/aws.ts',
  'cli/src/utils/alert-webhook.ts',
  'config-engine/src/context-detection.ts',
  'llm-provider/src/index.js',
  'api-server/src/server.ts',
  'api-server/src/routes/system.ts',
  'ideia-plugin/lib/node/llm-provider.js',
  'ideia-plugin/src/node/llm-provider.ts',
  'langgraph-observability/src/langgraph-observability.ts',
  'local-ai/src/hardware.ts',
  'supply-chain-sec/src/sigstore-signer.ts',
  'acceleration/src/route-selector.ts',
  'core/bin/ai-runner.js',
  'llm-integration/src/providers/index.ts',
];

function migrateFile(filePath: string): void {
  const fullPath = path.join(__dirname, '../packages', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Add ConfigManager import if not present
  if (!content.includes('ConfigManager')) {
    const importMatch = content.match(/^import .+$/m);
    if (importMatch) {
      const insertPos = content.indexOf(importMatch[0]) + importMatch[0].length;
      content = content.slice(0, insertPos) + '\nimport { ConfigManager } from '@ideia/config-engine';' + content.slice(insertPos);
      // Add config instance after imports
      const configInit = '\nconst config = ConfigManager.getInstance();\n';
      const importSectionEnd = content.indexOf('\n\n', insertPos);
      if (importSectionEnd !== -1) {
        content = content.slice(0, importSectionEnd) + configInit + content.slice(importSectionEnd);
      }
    }
  }

  // Replace process.env.X with config.get('X')
  content = content.replace(/process\.env\.(\w+)/g, 'config.get(\'$1\')');

  if (content !== original) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`Migrated: ${filePath}`);
  } else {
    console.log(`No changes: ${filePath}`);
  }
}

console.log('Starting migration...');
filesToMigrate.forEach(migrateFile);
console.log('Migration complete.');
