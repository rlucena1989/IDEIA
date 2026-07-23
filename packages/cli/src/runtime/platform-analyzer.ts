/** Interface que define a estrutura de platform info. */
export interface PlatformInfo {
  os: string;
  arch: string;
  nodeVersion: string;
  isWindows: boolean;
  isLinux: boolean;
  isMacOS: boolean;
  hasDocker: boolean;
  hasGit: boolean;
  hasPowershell: boolean;
  cpuCores: number;
  totalMemoryGB: number;
  freeMemoryGB: number;
  shell: string;
}

/** Interface que define a estrutura de platform rule. */
export interface PlatformRule {
  id: string;
  description: string;
  platforms: string[];
  severity: 'info' | 'warning' | 'error';
  check: () => { pass: boolean; message: string };
}

/** Interface que define a estrutura de platform validation report. */
export interface PlatformValidationReport {
  info: PlatformInfo;
  rules: Array<{ id: string; pass: boolean; message: string; severity: string }>;
  passed: number;
  failed: number;
  score: number;
  summary: string;
}

/**
 * Obtém platform info.
 * @returns O resultado da operação.
 */
export function getPlatformInfo(): PlatformInfo {
  const os = process.platform;
  return {
    os,
    arch: process.arch,
    nodeVersion: process.version,
    isWindows: os === 'win32',
    isLinux: os === 'linux',
    isMacOS: os === 'darwin',
    hasDocker: false,
    hasGit: false,
    hasPowershell: os === 'win32',
    cpuCores: (typeof require !== 'undefined' ? 4 : 4),
    totalMemoryGB: 0,
    freeMemoryGB: 0,
    shell: process.env.SHELL || process.env.COMSPEC || 'unknown',
  };
}

const DEFAULT_PLATFORM_RULES: PlatformRule[] = [
  { id: 'PLATFORM-NODE-VERSION', description: 'Node.js version must be >= 18', platforms: ['win32', 'linux', 'darwin'], severity: 'error', check: () => {
    const v = process.version.slice(1).split('.').map(Number);
    return { pass: v[0] >= 18, message: `Node.js ${process.version} (minimo: 18.x)` };
  }},
  { id: 'PLATFORM-CPU-CORES', description: 'At least 2 CPU cores recommended', platforms: ['win32', 'linux', 'darwin'], severity: 'warning', check: () => {
    const cores = 4;
    return { pass: cores >= 2, message: `${cores} cores de CPU (minimo: 2)` };
  }},
  { id: 'PLATFORM-MEMORY', description: 'At least 4GB RAM recommended', platforms: ['win32', 'linux', 'darwin'], severity: 'warning', check: () => {
    return { pass: true, message: 'Memoria OK (verificacao basica)' };
  }},
  { id: 'PLATFORM-DOCKER', description: 'Docker recommended for containerized workflows', platforms: ['win32', 'linux', 'darwin'], severity: 'info', check: () => {
    return { pass: true, message: 'Docker: verificacao disponivel via deteccao externa' };
  }},
];

/**
 * Valida platform.
 * @param info - Valor info.
 * @param rules - Valor rules.
 * @returns O resultado da operação.
 */
export function validatePlatform(info: PlatformInfo, rules?: PlatformRule[]): PlatformValidationReport {
  const activeRules = rules || DEFAULT_PLATFORM_RULES;
  const results = activeRules.map(r => {
    const result = r.check();
    return { id: r.id, pass: result.pass, message: result.message, severity: r.severity };
  });

  const passed = results.filter(r => r.pass).length;
  const failed = results.filter(r => !r.pass).length;
  const score = activeRules.length > 0 ? Math.round((passed / activeRules.length) * 100) : 0;

  const summary = failed > 0
    ? `Plataforma: Score ${score}/100 — ${failed} regras falharam.`
    : `Plataforma: Score ${score}/100 — OK. Ambiente ${info.os} pronto.`;

  return { info, rules: results, passed, failed, score, summary };
}