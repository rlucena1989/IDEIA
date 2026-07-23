import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface SystemCheck {
  name: string;
  installed: boolean;
  version?: string;
  required?: string;
}

export interface InstallerResult {
  allPassed: boolean;
  checks: SystemCheck[];
  firstRun: boolean;
}

const CONFIG_DIR = '.ideia';
const CONFIG_FILE = 'setup-complete.json';

function getConfigPath(): string {
  return path.join(process.env.HOME || process.env.USERPROFILE || __dirname, CONFIG_DIR, CONFIG_FILE);
}

function isFirstRun(): boolean {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) return true;
  try {
    const data = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    return !data.completed;
  } catch {
    return true;
  }
}

function markComplete(): void {
  const configPath = getConfigPath();
  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify({ completed: true, version: '1.0.0', timestamp: new Date().toISOString() }, null, 2));
}

function checkNode(): SystemCheck {
  try {
    const version = execSync('node --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    const match = version.match(/v(\d+)/);
    const major = match ? parseInt(match[1], 10) : 0;
    return { name: 'Node.js', installed: major >= 20, version, required: '>= 20' };
  } catch {
    return { name: 'Node.js', installed: false, required: '>= 20' };
  }
}

function checkNpm(): SystemCheck {
  try {
    const version = execSync('npm --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    return { name: 'npm', installed: true, version, required: '>= 10' };
  } catch {
    return { name: 'npm', installed: false, required: '>= 10' };
  }
}

function checkGit(): SystemCheck {
  try {
    const version = execSync('git --version', { encoding: 'utf-8', timeout: 5000 }).trim();
    return { name: 'Git', installed: true, version, required: 'any' };
  } catch {
    return { name: 'Git', installed: false, required: 'any' };
  }
}

function checkPort(port: number): SystemCheck {
  try {
    if (process.platform === 'win32') {
      execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf-8', timeout: 3000 });
      return { name: `Port ${port}`, installed: false, version: 'IN USE', required: 'free' };
    }
    execSync(`lsof -i :${port}`, { encoding: 'utf-8', timeout: 3000 });
    return { name: `Port ${port}`, installed: false, version: 'IN USE', required: 'free' };
  } catch {
    return { name: `Port ${port}`, installed: true, version: 'FREE', required: 'free' };
  }
}

export function checkSystem(): InstallerResult {
  const checks: SystemCheck[] = [
    checkNode(),
    checkNpm(),
    checkGit(),
    checkPort(3030),
  ];

  const allPassed = checks.every(c => c.installed);
  const firstRun = isFirstRun();

  return { allPassed, checks, firstRun };
}

export function runFirstRunWizard(): void {
  if (!isFirstRun()) return;

  console.log('[IDEIA] First run — checking system...');
  const result = checkSystem();

  for (const check of result.checks) {
    const status = check.installed ? 'OK' : `MISSING (required: ${check.required})`;
    console.log(`  ${check.name}: ${check.version || ''} [${status}]`);
  }

  markComplete();
  console.log('[IDEIA] First run setup complete');
}
