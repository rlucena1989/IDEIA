import { createLogger } from '@ideia/logger';
import * as fs from 'fs';
import * as path from 'path';

const logger = createLogger('verify-sync');

interface VerifyOptions {
  sourcePath?: string;
  targetPath?: string;
}

function parseArgs(): VerifyOptions {
  const args = process.argv.slice(2);
  const options: VerifyOptions = {};
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'source-path') options.sourcePath = value;
    if (key === 'target-path') options.targetPath = value;
  }
  return options;
}

async function main() {
  const options = parseArgs();
  const vectorPath = options.sourcePath ?? '.deploy/backups/vector-store';
  const llmPath = options.targetPath ?? '.deploy/backups/llm-state';

  let verified = 0;
  let failed = 0;

  for (const dir of [vectorPath, llmPath]) {
    try {
      if (!fs.existsSync(dir)) {
        logger.warn('Backup directory not found', { path: dir });
        failed++;
        continue;
      }
      const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
      if (files.length === 0) {
        logger.warn('No backup files found', { path: dir });
        failed++;
        continue;
      }
      const latest = files.sort().reverse()[0];
      const content = JSON.parse(fs.readFileSync(path.join(dir, latest), 'utf-8'));
      if (content.backedUpAt) {
        const age = Date.now() - content.backedUpAt;
        logger.info('Backup verified', { path: dir, file: latest, ageMs: age });
        verified++;
      } else {
        logger.warn('Backup file missing backedUpAt timestamp', { path: dir, file: latest });
        failed++;
      }
    } catch (err) {
      logger.error('Failed to verify backup', { path: dir, error: String(err) });
      failed++;
    }
  }

  if (failed === 0) {
    logger.info('All backups verified successfully');
    process.exit(0);
  } else {
    logger.error('Some backups failed verification', { verified, failed });
    process.exit(1);
  }
}

main();
