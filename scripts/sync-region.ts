import { createLogger } from '@ideia/logger';
import { DRManager } from '@ideia/data-layer';

const logger = createLogger('sync-region');

interface SyncOptions {
  source: string;
  target: string;
}

function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = { source: 'primary', target: 'secondary' };
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'source') options.source = value ?? 'primary';
    if (key === 'target') options.target = value ?? 'secondary';
  }
  return options;
}

async function main() {
  const options = parseArgs();
  logger.info('Starting region sync', options);

  const drManager = new DRManager();
  const result = await drManager.runGeoRedundancyBackup();

  if (result.vectorStore && result.llmState) {
    logger.info('Region sync completed successfully', { source: options.source, target: options.target, ...result });
    process.exit(0);
  } else {
    logger.error('Region sync completed with failures', result);
    process.exit(1);
  }
}

main();
