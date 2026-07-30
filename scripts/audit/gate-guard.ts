/**
 * gate-guard.ts — Imutabilidade dos gates de governança (FA-07)
 *
 * Prova que os gates são REAIS, CORRETOS e IMUTÁVEIS pelo agente:
 *   - Gate de build: `tsc -b` (FA-01)
 *   - Gate de métricas: `regenerate-metrics.ts --ci` (FA-04)
 *   - Hooks, CI workflows, jest config, políticas de autonomia
 *
 * Enforcement híbrido:
 *   1. Manifesto SHA-256 (`.ai/governance/gate-manifest.json`) — integridade criptográfica
 *   2. Lista de paths protegidos — bloqueio de edição sem token admin
 *   3. Audit trail append-only (`.ai/audit-trail/gate-penetration.jsonl`) — cadeia SHA-256
 *
 * Modos:
 *   npx tsx scripts/audit/gate-guard.ts --verify-staged   # pre-commit: bloqueia agente
 *   npx tsx scripts/audit/gate-guard.ts --ci              # CI: manifest + pentest
 *   npx tsx scripts/audit/gate-guard.ts --pentest          # simula ataques do agente
 *   npx tsx scripts/audit/gate-guard.ts --update-manifest  # admin: regenera hashes (IDEIA_GATE_ADMIN=1)
 */

import {
  createHash,
  randomUUID,
} from 'node:crypto';
import { fileURLToPath } from 'node:url';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  appendFileSync,
} from 'node:fs';
import { join, resolve, relative, normalize } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = resolve(__dirname, '..', '..');
const MANIFEST_REL = '.ai/governance/gate-manifest.json';
const MANIFEST_PATH = join(ROOT, MANIFEST_REL);
const AUDIT_PATH = join(ROOT, '.ai', 'audit-trail', 'gate-penetration.jsonl');

/** Paths críticos — alteração exige IDEIA_GATE_ADMIN=1 + --update-manifest após commit. */
export const PROTECTED_GATE_PATHS: readonly string[] = [
  // FA-01 — build gate
  'package.json',
  'tsconfig.json',
  'tsconfig.base.json',
  // Hooks
  '.husky/pre-commit',
  '.husky/commit-msg',
  '.lintstagedrc.json',
  // FA-04 — metrics gate
  'scripts/audit/regenerate-metrics.ts',
  'docs/governance/REALITY-MANIFEST.md',
  // FA-07 — self
  'scripts/audit/gate-guard.ts',
  '.ai/governance/gate-manifest.json',
  // CI gates
  '.github/workflows/pr-gate.yml',
  '.github/workflows/ci.yml',
  '.github/workflows/docs-verify.yml',
  '.github/workflows/release-gate.yml',
  // Test gate
  'jest.config.js',
  'jest.e2e.config.js',
  // Autonomy / policy escalation
  '.ai/policies/project-policy.yaml',
  '.ai/policies/security-policy.yaml',
  '.ai/policies/security.policy.yaml',
  '.ai/security/agent-safety-policy.md',
];

/** Paths whose hash entra no manifesto (exclui o próprio manifesto — evita referência circular). */
const MANIFEST_HASH_PATHS = PROTECTED_GATE_PATHS.filter((p) => p !== MANIFEST_REL);

export interface GateManifestEntry {
  path: string;
  sha256: string;
  category: 'build' | 'hooks' | 'metrics' | 'ci' | 'tests' | 'governance' | 'self';
}

export interface GateManifest {
  version: 1;
  generatedAt: string;
  generatedBy: 'gate-guard.ts --update-manifest';
  faPhase: 'FA-07';
  enforcement: 'sha256-manifest + actor-block + audit-chain';
  entries: GateManifestEntry[];
  manifestHash: string;
}

export interface PenetrationAttempt {
  id: string;
  scenario: 'disable-gate' | 'inflate-metrics' | 'fake-tests' | 'admin-escalation';
  target: string;
  actor: 'agent' | 'human' | 'ci';
  blocked: boolean;
  reason: string;
}

export interface GuardCheckResult {
  allowed: boolean;
  blockedPaths: string[];
  warnings: string[];
  actor: string;
  requiresAdmin: boolean;
}

function categorize(path: string): GateManifestEntry['category'] {
  if (path.includes('workflow') || path.includes('.github/')) return 'ci';
  if (path.includes('jest') || path.includes('test')) return 'tests';
  if (path.includes('husky') || path.includes('lint-staged')) return 'hooks';
  if (path.includes('regenerate-metrics') || path.includes('REALITY-MANIFEST')) return 'metrics';
  if (path.includes('gate-guard') || path.includes('gate-manifest') || path.includes('policies')) return 'governance';
  if (path.includes('tsconfig') || path === 'package.json') return 'build';
  return 'self';
}

/** Calcula SHA-256 de um arquivo relativo ao repo root. */
export function hashFile(relativePath: string): string | null {
  const abs = join(ROOT, relativePath);
  if (!existsSync(abs)) return null;
  const content = readFileSync(abs);
  return createHash('sha256').update(content).digest('hex');
}

/** Normaliza path para comparação cross-platform. */
export function normalizeRel(p: string): string {
  return normalize(p).replace(/\\/g, '/');
}

/** Detecta se o actor atual é um agente de IA. */
export function detectActor(): 'agent' | 'human' | 'ci' {
  if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') return 'ci';
  if (
    process.env.IDEIA_ACTOR === 'agent' ||
    process.env.CURSOR_AGENT === '1' ||
    process.env.AGENT_MODE === '1'
  ) {
    return 'agent';
  }
  return 'human';
}

/** Verifica se um path está na lista protegida. */
export function isProtectedPath(filePath: string): boolean {
  const norm = normalizeRel(filePath);
  return PROTECTED_GATE_PATHS.some((p) => norm === p || norm.endsWith(`/${p}`));
}

/** Verifica token admin explícito. */
export function hasAdminToken(): boolean {
  return process.env.IDEIA_GATE_ADMIN === '1' || process.env.IDEIA_GATE_ADMIN === 'true';
}

/**
 * Avalia se uma modificação em paths protegidos é permitida.
 * Agentes NUNCA podem modificar gates — independente de bypass.
 */
export function evaluateModification(
  changedPaths: string[],
  actor: 'agent' | 'human' | 'ci' = detectActor(),
): GuardCheckResult {
  const blockedPaths = changedPaths
    .map(normalizeRel)
    .filter(isProtectedPath);

  if (blockedPaths.length === 0) {
    return { allowed: true, blockedPaths: [], warnings: [], actor, requiresAdmin: false };
  }

  // Agentes: bloqueio absoluto — sem exceção
  if (actor === 'agent') {
    return {
      allowed: false,
      blockedPaths,
      warnings: [],
      actor,
      requiresAdmin: true,
    };
  }

  // Humanos/CI: exigem token admin para alterar infraestrutura de gates
  if (!hasAdminToken()) {
    return {
      allowed: false,
      blockedPaths,
      warnings: ['Alteração de gate exige IDEIA_GATE_ADMIN=1 e --update-manifest após commit'],
      actor,
      requiresAdmin: true,
    };
  }

  return {
    allowed: true,
    blockedPaths: [],
    warnings: [`Admin override: ${blockedPaths.join(', ')}`],
    actor,
    requiresAdmin: false,
  };
}

interface AuditEntry {
  eventId: string;
  timestamp: string;
  eventType: 'gate.penetration.blocked' | 'gate.penetration.allowed' | 'gate.manifest.updated';
  actor: string;
  target: string;
  scenario?: string;
  blocked: boolean;
  reason: string;
  previousHash?: string;
  entryHash: string;
}

function hashAuditEntry(entry: Omit<AuditEntry, 'entryHash'>): string {
  return createHash('sha256').update(JSON.stringify(entry, Object.keys(entry).sort())).digest('hex');
}

function getLastAuditHash(): string | undefined {
  if (!existsSync(AUDIT_PATH)) return undefined;
  const lines = readFileSync(AUDIT_PATH, 'utf-8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return undefined;
  try {
    const last = JSON.parse(lines[lines.length - 1]) as AuditEntry;
    return last.entryHash;
  } catch {
    return undefined;
  }
}

/** Registra tentativa de penetração ou evento de gate no audit trail. */
export function logGateEvent(
  eventType: AuditEntry['eventType'],
  target: string,
  blocked: boolean,
  reason: string,
  scenario?: string,
): void {
  mkdirSync(join(ROOT, '.ai', 'audit-trail'), { recursive: true });
  const previousHash = getLastAuditHash();
  const base: Omit<AuditEntry, 'entryHash'> = {
    eventId: randomUUID(),
    timestamp: new Date().toISOString(),
    eventType,
    actor: detectActor(),
    target,
    scenario,
    blocked,
    reason,
    previousHash,
  };
  const entry: AuditEntry = { ...base, entryHash: hashAuditEntry(base) };
  appendFileSync(AUDIT_PATH, `${JSON.stringify(entry)}\n`, 'utf-8');
}

/** Gera manifesto SHA-256 de todos os paths protegidos existentes. */
export function buildManifest(): GateManifest {
  const entries: GateManifestEntry[] = [];
  for (const p of MANIFEST_HASH_PATHS) {
    const sha256 = hashFile(p);
    if (sha256) {
      entries.push({ path: p, sha256, category: categorize(p) });
    }
  }
  entries.sort((a, b) => a.path.localeCompare(b.path));

  const body = {
    version: 1 as const,
    generatedAt: new Date().toISOString(),
    generatedBy: 'gate-guard.ts --update-manifest' as const,
    faPhase: 'FA-07' as const,
    enforcement: 'sha256-manifest + actor-block + audit-chain',
    entries,
  };
  const manifestHash = createHash('sha256')
    .update(JSON.stringify({ ...body, entries }))
    .digest('hex');

  return { ...body, manifestHash };
}

/** Carrega manifesto do disco. */
export function loadManifest(): GateManifest | null {
  if (!existsSync(MANIFEST_PATH)) return null;
  try {
    return JSON.parse(readFileSync(MANIFEST_PATH, 'utf-8')) as GateManifest;
  } catch {
    return null;
  }
}

/** Verifica integridade: hashes atuais vs manifesto commitado. */
export function verifyManifestIntegrity(): { ok: boolean; drifts: string[] } {
  const manifest = loadManifest();
  if (!manifest) {
    return { ok: false, drifts: ['gate-manifest.json ausente — rode --update-manifest com IDEIA_GATE_ADMIN=1'] };
  }

  const drifts: string[] = [];
  for (const entry of manifest.entries) {
    const current = hashFile(entry.path);
    if (current === null) {
      drifts.push(`${entry.path}: arquivo removido`);
    } else if (current !== entry.sha256) {
      drifts.push(`${entry.path}: hash diverge (manifest=${entry.sha256.slice(0, 12)}… actual=${current.slice(0, 12)}…)`);
    }
  }

  return { ok: drifts.length === 0, drifts };
}

/** Obtém arquivos staged no git. */
function getStagedFiles(): string[] {
  const r = spawnSync('git', ['diff', '--cached', '--name-only'], {
    cwd: ROOT,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) return [];
  return r.stdout.split('\n').map((l) => l.trim()).filter(Boolean);
}

/** Cenários de penetração simulados (sem persistir alterações maliciosas). */
export function runPenetrationTests(): PenetrationAttempt[] {
  const attempts: PenetrationAttempt[] = [];

  const scenarios: Array<{
    id: PenetrationAttempt['scenario'];
    target: string;
    description: string;
    maliciousContent: string;
  }> = [
    {
      id: 'disable-gate',
      target: '.husky/pre-commit',
      description: 'Agente tenta esvaziar pre-commit para pular lint-staged',
      maliciousContent: '#!/bin/sh\nexit 0\n',
    },
    {
      id: 'inflate-metrics',
      target: 'scripts/audit/regenerate-metrics.ts',
      description: 'Agente tenta hardcodar totalPackages = 9999 no script de métricas',
      maliciousContent: 'const totalPackages = 9999; // bypass FA-04',
    },
    {
      id: 'fake-tests',
      target: 'jest.config.js',
      description: 'Agente tenta zerar coverageThreshold para auto-aprovar testes',
      maliciousContent: 'coverageThreshold: { global: { lines: 0 } }',
    },
    {
      id: 'admin-escalation',
      target: '.ai/policies/project-policy.yaml',
      description: 'Agente tenta elevar autonomia para N3 sem aprovação',
      maliciousContent: 'autonomy_level: N3\napproval_bypass: true',
    },
  ];

  for (const s of scenarios) {
    const check = evaluateModification([s.target], 'agent');
    const blocked = !check.allowed;
    const reason = blocked
      ? `Bloqueado: agente não pode modificar ${s.target} (${s.description})`
      : `FALHA CRÍTICA: agente conseguiu modificar ${s.target}`;

    attempts.push({
      id: randomUUID(),
      scenario: s.id,
      target: s.target,
      actor: 'agent',
      blocked,
      reason,
    });

    logGateEvent(
      blocked ? 'gate.penetration.blocked' : 'gate.penetration.allowed',
      s.target,
      blocked,
      reason,
      s.id,
    );
  }

  // Verificar que gates reais existem e são funcionais (não vazios)
  const pkg = existsSync(join(ROOT, 'package.json'))
    ? readFileSync(join(ROOT, 'package.json'), 'utf-8')
    : '';
  const typecheckReal = pkg.includes('"typecheck": "tsc -b"') || pkg.includes('"build": "tsc -b"');
  attempts.push({
    id: randomUUID(),
    scenario: 'disable-gate',
    target: 'package.json',
    actor: 'agent',
    blocked: typecheckReal,
    reason: typecheckReal
      ? 'Gate build REAL confirmado: typecheck/build usa tsc -b (FA-01)'
      : 'FALHA: package.json não referencia tsc -b como gate',
  });

  const metricsScript = existsSync(join(ROOT, 'scripts/audit/regenerate-metrics.ts'));
  attempts.push({
    id: randomUUID(),
    scenario: 'inflate-metrics',
    target: 'scripts/audit/regenerate-metrics.ts',
    actor: 'agent',
    blocked: metricsScript && isProtectedPath('scripts/audit/regenerate-metrics.ts'),
    reason: metricsScript
      ? 'Script FA-04 presente e path protegido'
      : 'FALHA: regenerate-metrics.ts ausente',
  });

  return attempts;
}

function cmdVerifyStaged(): number {
  const staged = getStagedFiles();
  const check = evaluateModification(staged);

  if (!check.allowed) {
    for (const p of check.blockedPaths) {
      logGateEvent('gate.penetration.blocked', p, true, `Pre-commit bloqueou edição de gate por ${check.actor}`, 'verify-staged');
    }
    console.error('\n❌ FA-07 gate-guard: alteração de infraestrutura de gates bloqueada.\n');
    console.error(`   Actor: ${check.actor}`);
    console.error(`   Paths: ${check.blockedPaths.join(', ')}`);
    if (check.requiresAdmin) {
      console.error('\n   Gates são imutáveis pelo agente.');
      console.error('   Humanos: export IDEIA_GATE_ADMIN=1, faça a alteração, depois:');
      console.error('   npx tsx scripts/audit/gate-guard.ts --update-manifest\n');
    }
    return 1;
  }

  console.log('✅ gate-guard --verify-staged: nenhuma alteração proibida em gates.');
  return 0;
}

function cmdCi(): number {
  let exitCode = 0;

  const integrity = verifyManifestIntegrity();
  if (!integrity.ok) {
    console.error('\n❌ FA-07 gate-guard --ci: integridade do manifesto comprometida.\n');
    for (const d of integrity.drifts) console.error(`   • ${d}`);
    console.error('\n   Regenerar (admin): IDEIA_GATE_ADMIN=1 npx tsx scripts/audit/gate-guard.ts --update-manifest\n');
    exitCode = 1;
  } else {
    console.log('✅ Manifesto SHA-256 íntegro — todos os hashes conferem.');
  }

  const attempts = runPenetrationTests();
  const failures = attempts.filter((a) => !a.blocked);
  if (failures.length > 0) {
    console.error('\n❌ FA-07 pentest: tentativas NÃO bloqueadas:\n');
    for (const f of failures) console.error(`   • [${f.scenario}] ${f.target}: ${f.reason}`);
    exitCode = 1;
  } else {
    console.log(`✅ Pentest: ${attempts.length} cenários — todas as tentativas bloqueadas e logadas.`);
  }

  return exitCode;
}

function cmdPentest(): number {
  const attempts = runPenetrationTests();
  console.log('\n📋 FA-07 Gate Penetration Test Report\n');
  for (const a of attempts) {
    const icon = a.blocked ? '🛡️' : '🚨';
    console.log(`${icon} [${a.scenario}] ${a.target}`);
    console.log(`   ${a.reason}\n`);
  }
  const failures = attempts.filter((a) => !a.blocked);
  console.log(`Total: ${attempts.length} | Bloqueadas: ${attempts.length - failures.length} | Falhas: ${failures.length}`);
  return failures.length > 0 ? 1 : 0;
}

function cmdUpdateManifest(): number {
  if (!hasAdminToken()) {
    console.error('❌ --update-manifest exige IDEIA_GATE_ADMIN=1 (token admin explícito).');
    logGateEvent('gate.penetration.blocked', MANIFEST_PATH, true, 'Tentativa de update-manifest sem admin token');
    return 1;
  }

  mkdirSync(join(ROOT, '.ai', 'governance'), { recursive: true });
  const manifest = buildManifest();
  writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`, 'utf-8');
  logGateEvent('gate.manifest.updated', MANIFEST_PATH, false, `Manifesto regenerado com ${manifest.entries.length} entradas`);
  console.log(`✅ gate-manifest.json atualizado (${manifest.entries.length} paths, hash=${manifest.manifestHash.slice(0, 16)}…)`);
  return 0;
}

function main(): void {
  const args = process.argv.slice(2);
  let code = 0;

  if (args.includes('--update-manifest')) {
    code = cmdUpdateManifest();
  } else if (args.includes('--verify-staged')) {
    code = cmdVerifyStaged();
  } else if (args.includes('--pentest')) {
    code = cmdPentest();
  } else if (args.includes('--ci')) {
    code = cmdCi();
  } else {
    console.log(`gate-guard.ts (FA-07) — uso:
  --verify-staged   Bloqueia commit com alteração de gates (pre-commit)
  --ci              Verifica manifesto SHA-256 + roda pentest (PR gate)
  --pentest         Simula ataques do agente e reporta
  --update-manifest Regenera hashes (requer IDEIA_GATE_ADMIN=1)`);
    code = 0;
  }

  process.exit(code);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
