import fs from 'node:fs';
import { execSync } from 'node:child_process';
import { HealthCheckResult } from './types';

export function healthCheck(): HealthCheckResult {
  const reasons: string[] = [];

  // Check package.json
  if (!fs.existsSync('package.json')) {
    reasons.push('package.json nao encontrado');
  }

  // Check tsconfig
  if (!fs.existsSync('tsconfig.json')) {
    reasons.push('tsconfig.json nao encontrado');
  }

  // Check node_modules
  if (!fs.existsSync('node_modules')) {
    reasons.push('node_modules nao instalado (rode npm install)');
  }

  // Check write permission
  try {
    fs.accessSync('.', fs.constants.W_OK);
  } catch {
    reasons.push('diretorio sem permissao de escrita');
  }

  // Check dist (build)
  if (!fs.existsSync('packages/cli/dist/index.js')) {
    reasons.push('CLI nao compilada (rode npm run build)');
  }

  // Check npm audit for critical vulnerabilities
  try {
    const audit = execSync(
      'npm audit --json 2>&1',
      { stdio: 'pipe', timeout: 30000 }
    ).toString();
    const data = JSON.parse(audit);
    const vulns = data.metadata?.vulnerabilities;
    if (vulns && (vulns.critical ?? 0) > 0) {
      reasons.push(`${vulns.critical} vulnerabilidade(s) critica(s) no npm`);
    }
  } catch {
    // npm audit exits with non-zero when vulns found
    try {
      const auditErr = execSync(
        'npm audit --json 2>&1',
        { stdio: 'pipe', timeout: 30000 }
      ).toString();
      if (auditErr) {
        const data = JSON.parse(auditErr);
        const vulns = data.metadata?.vulnerabilities;
        if (vulns && (vulns.critical ?? 0) > 0) {
          reasons.push(`${vulns.critical} vulnerabilidade(s) critica(s) no npm`);
        }
      }
    } catch {
      reasons.push('npm audit falhou â€” possivel problema de rede ou registro');
    }
  }

  // Check git
  try {
    execSync('git rev-parse --is-inside-work-tree 2>&1', { stdio: 'pipe' });
  } catch {
    reasons.push('repositorio git nao inicializado');
  }

  // Check AI rules directory
  if (!fs.existsSync('.ai')) {
    reasons.push('diretorio .ai/ nao encontrado â€” governanca ausente');
  }

  return {
    healthy: true,
    reasons
  };
}
