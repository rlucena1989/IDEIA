#!/usr/bin/env tsx

import fs from 'fs';
import path from 'path';

// Dry-run migration script for process.env to ConfigManager
// This shows what would be changed without actually modifying files

const filesToMigrate = [
  'incident-manager\\src\\incident-notifier.ts',
  'event-bus\\src\\nats-config.ts',
  'human-gate-pipeline\\src\\human-approval-gate.ts',
  'llm-provider\\src\\index.ts',
  'acceleration\\src\\config.ts',
  'code-signing\\src\\code-sign-pipeline.ts',
  'cli\\src\\local-ai\\providers\\aws.ts',
  'cli\\src\\utils\\alert-webhook.ts',
  'config-engine\\src\\context-detection.ts',
  'llm-provider\\src\\index.js',
  'api-server\\src\\server.ts',
  'api-server\\src\\routes\\system.ts',
  'ideia-plugin\\lib\\node\\llm-provider.js',
  'ideia-plugin\\src\\node\\llm-provider.ts',
  'langgraph-observability\\src\\langgraph-observability.ts',
  'local-ai\\src\\hardware.ts',
  'supply-chain-sec\\src\\sigstore-signer.ts',
  'acceleration\\src\\route-selector.ts',
  'core\\bin\\ai-runner.js',
  'llm-integration\\src\\providers\\index.ts',
];

function dryRunFile(filePath: string): void {
  const fullPath = path.join(__dirname, '../packages', filePath);
  if (!fs.existsSync(fullPath)) {
    console.log(`❌ File not found: ${filePath}`);
    return;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  const original = content;

  // Check if ConfigManager import would be added
  let wouldAddImport = false;
  if (!content.includes('ConfigManager')) {
    const importMatch = content.match(/^import .+$/m);
    if (importMatch) {
      wouldAddImport = true;
    }
  }

  // Count process.env occurrences
  const matches = content.match(/process\.env\.(\w+)/g);
  const count = matches ? matches.length : 0;
  const uniqueVars = matches ? [...new Set(matches.map(m => m.replace('process.env.', '')))] : [];

  if (count > 0 || wouldAddImport) {
    console.log(`\n📄 ${filePath}`);
    console.log(`   - process.env occurrences: ${count}`);
    if (uniqueVars.length > 0) {
      console.log(`   - Variables: ${uniqueVars.join(', ')}`);
    }
    if (wouldAddImport) {
      console.log(`   - Would add: ConfigManager import and initialization`);
    }
    console.log(`   - Status: Would be modified`);
  } else {
    console.log(`✓ ${filePath} - No changes needed`);
  }
}

console.log('=== DRY RUN: process.env Migration ===\n');
console.log('This shows what would be changed without modifying files\n');

filesToMigrate.forEach(dryRunFile);

console.log('\n=== Summary ===');
console.log('Review the changes above before running the actual migration.');
console.log('To run the actual migration, execute: npx tsx scripts/migrate-process-env-auto.ts');
