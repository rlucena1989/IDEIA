import { SecretsManager, EnvSecretProvider, MemorySecretProvider } from '../packages/encryption/src/secrets-manager';
import { RotationScheduler } from '../packages/encryption/src/rotation-scheduler';

function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  const raw = process.argv.slice(2);
  for (let i = 0; i < raw.length; i++) {
    const arg = raw[i]!;
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = raw[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function main(): Promise<void> {
  const args = parseArgs();
  const manager = new SecretsManager();
  manager.registerProvider('env', new EnvSecretProvider());
  manager.registerProvider('memory', new MemorySecretProvider());

  const scheduler = new RotationScheduler(manager);

  if (args.list) {
    console.log('\n# Tracked Secrets\n');
    const schedules = manager.getSchedules();
    if (schedules.size === 0) {
      console.log('No secrets are being tracked. Register secrets via --rotate or schedule them.\n');
    }
    for (const [name, cron] of schedules) {
      const history = manager.getRotationHistory(name);
      const lastRotation = history.length > 0 ? new Date(history[history.length - 1]!.timestamp).toISOString() : 'never';
      console.log(`  ${name}`);
      console.log(`    Schedule : ${cron}`);
      console.log(`    Rotations: ${history.length}`);
      console.log(`    Last     : ${lastRotation}\n`);
    }
    return;
  }

  if (args.rotate && typeof args.rotate === 'string') {
    console.log(`\nRotating secret: ${args.rotate}...`);
    const result = await manager.rotateSecret(args.rotate);
    if (result.status === 'success') {
      console.log(`✅ ${result.secretName} rotated successfully`);
      console.log(`   Old: ${result.oldValue.substring(0, 8)}...`);
      console.log(`   New: ${result.newValue.substring(0, 8)}...`);
    } else {
      console.error(`❌ Rotation failed: ${result.error}`);
      process.exit(1);
    }
    return;
  }

  if (args['rotate-all']) {
    console.log('\n# Rotating All Expired Secrets\n');
    const schedules = manager.getSchedules();
    if (schedules.size === 0) {
      console.log('No scheduled secrets to rotate.\n');
      return;
    }
    for (const [name] of schedules) {
      console.log(`  Rotating ${name}...`);
      const result = await manager.rotateSecret(name);
      if (result.status === 'success') {
        console.log(`  ✅ ${name} rotated\n`);
      } else {
        console.error(`  ❌ ${name} failed: ${result.error}\n`);
      }
    }
    return;
  }

  if (args.audit) {
    console.log('\n# Rotation Audit Log\n');
    const log = manager.auditLog();
    if (log.length === 0) {
      console.log('No audit entries found.\n');
      return;
    }
    for (const entry of log) {
      const time = new Date(entry.timestamp).toISOString();
      console.log(`  ${time}`);
      console.log(`  Action  : ${entry.action}`);
      console.log(`  Secret  : ${entry.secretName}`);
      console.log(`  Actor   : ${entry.actor}`);
      console.log(`  Hash    : ${entry.hash.substring(0, 16)}...\n`);
    }
    console.log(`Total entries: ${log.length}\n`);
    return;
  }

  if (args.schedule) {
    console.log('\n# Schedule Check\n');
    scheduler.addJob('test-secret', '*/5 * * * *');
    const pending = scheduler.getPendingRotations();
    if (pending.length === 0) {
      console.log('No rotations are due at this time.\n');
    } else {
      for (const job of pending) {
        console.log(`  Due now: ${job.name} (${job.cronExpression})\n`);
      }
    }
    return;
  }

  console.log(`Usage: node scripts/rotate-secrets.ts [options]

Options:
  --list               List all tracked secrets
  --rotate <name>      Rotate a specific secret
  --rotate-all         Rotate all expired secrets
  --audit              Show rotation audit log
  --schedule           Check if any rotations are due
`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
