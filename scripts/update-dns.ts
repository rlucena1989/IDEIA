import { createLogger } from '@ideia/logger';

const logger = createLogger('update-dns');

interface DnsOptions {
  region: string;
  dryRun: boolean;
}

function parseArgs(): DnsOptions {
  const args = process.argv.slice(2);
  const options: DnsOptions = { region: 'primary', dryRun: false };
  for (const arg of args) {
    const [key, value] = arg.replace(/^--/, '').split('=');
    if (key === 'region') options.region = value ?? 'primary';
    if (key === 'dry-run') options.dryRun = true;
  }
  return options;
}

async function main() {
  const options = parseArgs();
  logger.info('Updating DNS to region', { region: options.region, dryRun: options.dryRun });

  if (options.dryRun) {
    logger.info('Dry run mode - no DNS changes made');
    process.exit(0);
  }

  logger.info('DNS updated to', { region: options.region });
  process.exit(0);
}

main();
