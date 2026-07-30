import { execFileSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..');
const COMPOSE_FILE = join(ROOT, 'docker', 'nats', 'docker-compose.yml');
const FULL_COMPOSE = join(ROOT, 'docker', 'docker-compose.yml');

function checkDocker(): boolean {
  try {
    execFileSync('docker', ['info'], { stdio: 'ignore', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

async function waitForNats(host = 'localhost', port = 4222, timeoutMs = 30000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const conn = new Promise<boolean>((resolve, reject) => {
        const sock = require('net').createConnection(port, host, () => {
          sock.end();
          resolve(true);
        });
        sock.on('error', reject);
        sock.setTimeout(2000);
        sock.on('timeout', () => { sock.destroy(); reject(new Error('timeout')); });
      });
      await conn;
      return true;
    } catch {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

async function main() {
  const args = process.argv.slice(2);
  const mode = args[0] || 'start';

  if (!checkDocker()) {
    console.error('Docker is not running. Please start Docker first.');
    process.exit(1);
  }

  const composeFile = args.includes('--full') ? FULL_COMPOSE : COMPOSE_FILE;

  if (!existsSync(composeFile)) {
    console.error(`Compose file not found: ${composeFile}`);
    process.exit(1);
  }

  switch (mode) {
    case 'start': {
      console.log(`Starting NATS via ${composeFile}...`);
      execFileSync('docker', ['compose', '-f', composeFile, 'up', '-d'], { stdio: 'inherit', cwd: ROOT });
      console.log('Waiting for NATS to be ready...');
      const ready = await waitForNats();
      if (ready) {
        console.log('NATS is ready on nats://localhost:4222');
      } else {
        console.error('NATS did not become ready in time');
        process.exit(1);
      }
      break;
    }
    case 'stop': {
      console.log('Stopping NATS...');
      execFileSync('docker', ['compose', '-f', composeFile, 'down'], { stdio: 'inherit', cwd: ROOT });
      console.log('NATS stopped');
      break;
    }
    case 'restart': {
      execFileSync('docker', ['compose', '-f', composeFile, 'restart'], { stdio: 'inherit', cwd: ROOT });
      console.log('NATS restarted');
      break;
    }
    case 'logs': {
      const child = spawn('docker', ['compose', '-f', composeFile, 'logs', '-f'], { stdio: 'inherit', cwd: ROOT });
      process.on('SIGINT', () => { child.kill(); process.exit(0); });
      break;
    }
    case 'status': {
      execFileSync('docker', ['compose', '-f', composeFile, 'ps'], { stdio: 'inherit', cwd: ROOT });
      break;
    }
    default:
      console.log('Usage: npx tsx scripts/start-nats.ts [start|stop|restart|logs|status] [--full]');
      console.log('  --full  Use full docker-compose.yml (NATS + PostgreSQL + monitoring)');
  }
}

main().catch(err => {
  console.error('Failed:', err);
  process.exit(1);
});
