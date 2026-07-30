/**
 * gate-guard.test.ts — FA-07
 *
 * Verifica imutabilidade dos gates:
 *   1. Agente bloqueado em paths protegidos
 *   2. Humano sem admin token bloqueado
 *   3. Admin com token permitido
 *   4. Pentest bloqueia todos os cenários
 *   5. Manifesto SHA-256 detecta drift
 */

import {
  existsSync,
  readFileSync,
  writeFileSync,
  mkdirSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  PROTECTED_GATE_PATHS,
  evaluateModification,
  isProtectedPath,
  hashFile,
  buildManifest,
  verifyManifestIntegrity,
  runPenetrationTests,
  loadManifest,
} from '../gate-guard';

const ROOT = resolve(__dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'audit', 'gate-guard.ts');
const MANIFEST = join(ROOT, '.ai', 'governance', 'gate-manifest.json');

function runGateGuard(args: string[], env: Record<string, string> = {}): number {
  const r = spawnSync('npx', ['tsx', SCRIPT, ...args], {
    cwd: ROOT,
    encoding: 'utf-8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
    timeout: 60_000,
  });
  return r.status ?? 1;
}

describe('gate-guard.ts (FA-07) — imutabilidade dos gates', () => {
  const origAdmin = process.env.IDEIA_GATE_ADMIN;
  const origActor = process.env.IDEIA_ACTOR;

  afterEach(() => {
    if (origAdmin === undefined) delete process.env.IDEIA_GATE_ADMIN;
    else process.env.IDEIA_GATE_ADMIN = origAdmin;
    if (origActor === undefined) delete process.env.IDEIA_ACTOR;
    else process.env.IDEIA_ACTOR = origActor;
  });

  it('script existe e documenta FA-07', () => {
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toMatch(/FA-07/);
    expect(content).toMatch(/--pentest/);
    expect(content).toMatch(/--verify-staged/);
  });

  it('PROTECTED_GATE_PATHS inclui gates críticos FA-01 e FA-04', () => {
    expect(PROTECTED_GATE_PATHS).toContain('package.json');
    expect(PROTECTED_GATE_PATHS).toContain('scripts/audit/regenerate-metrics.ts');
    expect(PROTECTED_GATE_PATHS).toContain('.husky/pre-commit');
    expect(PROTECTED_GATE_PATHS).toContain('.github/workflows/pr-gate.yml');
    expect(PROTECTED_GATE_PATHS).toContain('jest.config.js');
  });

  it('isProtectedPath identifica paths de gate', () => {
    expect(isProtectedPath('.husky/pre-commit')).toBe(true);
    expect(isProtectedPath('packages/cli/src/index.ts')).toBe(false);
  });

  it('agente NUNCA pode modificar gates (bloqueio absoluto)', () => {
    for (const p of ['.husky/pre-commit', 'scripts/audit/regenerate-metrics.ts', 'jest.config.js']) {
      const r = evaluateModification([p], 'agent');
      expect(r.allowed).toBe(false);
      expect(r.blockedPaths).toContain(p);
    }
  });

  it('humano sem IDEIA_GATE_ADMIN não pode modificar gates', () => {
    delete process.env.IDEIA_GATE_ADMIN;
    const r = evaluateModification(['.husky/pre-commit'], 'human');
    expect(r.allowed).toBe(false);
    expect(r.requiresAdmin).toBe(true);
  });

  it('humano com IDEIA_GATE_ADMIN=1 pode modificar gates (com log)', () => {
    process.env.IDEIA_GATE_ADMIN = '1';
    const r = evaluateModification(['.husky/pre-commit'], 'human');
    expect(r.allowed).toBe(true);
  });

  it('pentest bloqueia todos os 4 cenários de ataque do agente', () => {
    const attempts = runPenetrationTests();
    const coreScenarios = ['disable-gate', 'inflate-metrics', 'fake-tests', 'admin-escalation'] as const;
    for (const scenario of coreScenarios) {
      const match = attempts.find((a) => a.scenario === scenario && a.blocked);
      expect(match).toBeDefined();
    }
  });

  it('buildManifest gera hashes SHA-256 para paths existentes', () => {
    const manifest = buildManifest();
    expect(manifest.version).toBe(1);
    expect(manifest.faPhase).toBe('FA-07');
    expect(manifest.entries.length).toBeGreaterThan(5);
    for (const e of manifest.entries) {
      expect(e.sha256).toMatch(/^[a-f0-9]{64}$/);
      expect(hashFile(e.path)).toBe(e.sha256);
    }
  });

  it('--update-manifest exige IDEIA_GATE_ADMIN', () => {
    const code = runGateGuard(['--update-manifest'], { IDEIA_GATE_ADMIN: '' });
    expect(code).not.toBe(0);
  });

  it('--update-manifest com admin gera gate-manifest.json', () => {
    const code = runGateGuard(['--update-manifest'], { IDEIA_GATE_ADMIN: '1' });
    expect(code).toBe(0);
    expect(existsSync(MANIFEST)).toBe(true);
    const manifest = loadManifest();
    expect(manifest?.entries.length).toBeGreaterThan(0);
    expect(manifest?.manifestHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it('verifyManifestIntegrity passa após --update-manifest', () => {
    runGateGuard(['--update-manifest'], { IDEIA_GATE_ADMIN: '1' });
    const { ok, drifts } = verifyManifestIntegrity();
    expect(ok).toBe(true);
    expect(drifts).toHaveLength(0);
  });

  it('--ci falha se manifesto diverge de arquivo real', () => {
    runGateGuard(['--update-manifest'], { IDEIA_GATE_ADMIN: '1' });
    if (!existsSync(MANIFEST)) throw new Error('manifest ausente');

    const original = readFileSync(MANIFEST, 'utf-8');
    const parsed = JSON.parse(original) as { entries: Array<{ path: string; sha256: string }> };
    if (parsed.entries.length === 0) throw new Error('manifest vazio');

    parsed.entries[0].sha256 = '0'.repeat(64);
    writeFileSync(MANIFEST, JSON.stringify(parsed, null, 2), 'utf-8');

    try {
      const { ok } = verifyManifestIntegrity();
      expect(ok).toBe(false);
    } finally {
      writeFileSync(MANIFEST, original, 'utf-8');
      runGateGuard(['--update-manifest'], { IDEIA_GATE_ADMIN: '1' });
    }
  });

  it('--pentest retorna exit 0 quando todos os cenários bloqueados', () => {
    runGateGuard(['--update-manifest'], { IDEIA_GATE_ADMIN: '1' });
    const code = runGateGuard(['--pentest']);
    expect(code).toBe(0);
  });

  it('--ci retorna exit 0 com manifesto íntegro', () => {
    runGateGuard(['--update-manifest'], { IDEIA_GATE_ADMIN: '1' });
    const code = runGateGuard(['--ci'], { CI: 'true' });
    expect(code).toBe(0);
  });
});
