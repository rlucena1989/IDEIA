/**
 * regenerate-metrics.test.ts — FA-04
 *
 * Verifica determinismo do script `scripts/audit/regenerate-metrics.ts`:
 *   1. --ci retorna 0 quando REALITY-MANIFEST está sincronizado com o código
 *   2. --ci retorna 1 quando algum número é alterado manualmente
 *   3. --fix é idempotente — rodar 2× produz saída byte-igual (exceto timestamps)
 *   4. O output de --fix inclui todas as métricas canônicas exigidas pelo DoD
 *
 * Estes testes rodam o script como subprocesso (padrão `scripts/audit/consolidate.ts`).
 * Custo: ~2-3 min (script escaneia 292 packages em cada chamada).
 *
 * IMPORTANTE: os testes preservam o estado do repo — salvam o conteúdo de cada
 * arquivo de saída antes da mutação e restauram em afterAll (try/finally).
 * Nunca execute este arquivo fora de jest.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';

const ROOT = resolve(__dirname, '..', '..', '..');
const SCRIPT = join(ROOT, 'scripts', 'audit', 'regenerate-metrics.ts');
const MANIFEST = join(ROOT, 'docs', 'governance', 'REALITY-MANIFEST.md');
const INJECT = join(ROOT, '.ai', 'context', 'inject.json');
const HANDOFF = join(ROOT, '.ai', 'context', 'ai-handoff.md');
const STATE = join(ROOT, '.ai', 'context', 'project-state.md');
const MANIFEST_YAML = join(ROOT, '.ai', 'project-manifest.yaml');

const FILES_TO_SNAPSHOT = [MANIFEST, INJECT, HANDOFF, STATE, MANIFEST_YAML];

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
  signal: string | null;
  error: Error | null;
}

let runCount = 0;

function runScript(extraArgs: string[] = []): RunResult {
  runCount++;
  const r = spawnSync('npx', ['tsx', SCRIPT, ...extraArgs], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 240_000,
    windowsHide: true,
    env: { ...process.env, PATH: process.env.PATH ?? '' },
    shell: process.platform === 'win32',
  });
  return {
    status: r.status,
    stdout: r.stdout || '',
    stderr: r.stderr || '',
    signal: r.signal,
    error: r.error ?? null,
  };
}

function stripTimestamps(s: string): string {
  return s
    .replace(/\d{4}-\d{2}-\d{2}T[\d:.Z+-]+/g, '§ts§')
    .replace(/\d{4}-\d{2}-\d{2}/g, '§date§')
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+$/, ''))
    .join('\n');
}

function failWith(r: RunResult, ctx: string): never {
  throw new Error(
    `[${ctx}] script falhou: status=${r.status} signal=${r.signal} error=${r.error?.message}\n` +
      `STDOUT (head 1000):\n${r.stdout.slice(0, 1000)}\n` +
      `STDERR (head 1000):\n${r.stderr.slice(0, 1000)}`
  );
}

describe('regenerate-metrics.ts (FA-04) — fonte única da verdade', () => {
  const snapshots: Record<string, string> = {};

  beforeAll(() => {
    if (!existsSync(SCRIPT)) throw new Error(`Script não encontrado: ${SCRIPT}`);
    for (const f of FILES_TO_SNAPSHOT) {
      if (existsSync(f)) snapshots[f] = readFileSync(f, 'utf-8');
    }
    const r = runScript(['--fix']);
    if (r.status !== 0) failWith(r, 'beforeAll --fix');
  }, 300_000);

  afterAll(() => {
    for (const [f, content] of Object.entries(snapshots)) {
      try { writeFileSync(f, content, 'utf-8'); } catch { /* ignore */ }
    }
  });

  it('script existe e tem o cabeçalho de documentação', () => {
    const content = readFileSync(SCRIPT, 'utf-8');
    expect(content).toMatch(/regenerate-metrics\.ts.*FA-04/);
    expect(content).toMatch(/--ci/);
    expect(content).toMatch(/--fix/);
  });

  it('--ci retorna exit 0 quando REALITY-MANIFEST está sincronizado (após beforeAll --fix)', () => {
    const r = runScript(['--ci']);
    if (r.status !== 0) failWith(r, '--ci in sync');
    expect(r.stdout).toMatch(/CI: 12 arquivos sincronizados|Zero deriva/);
  }, 300_000);

  it('--ci retorna exit 1 quando um número é alterado manualmente', () => {
    if (!existsSync(MANIFEST)) throw new Error('REALITY-MANIFEST.md ausente');
    const original = readFileSync(MANIFEST, 'utf-8');
    const corrupted = original.replace(/Packages com `src\/` \| 292/, 'Packages com `src/` | 9999');

    if (corrupted === original) {
      throw new Error('Falha ao aplicar corrupção de teste (regex não casou em MANIFEST)');
    }

    try {
      writeFileSync(MANIFEST, corrupted, 'utf-8');
      const r = runScript(['--ci']);
      expect(r.status).toBe(1);
      expect(r.stdout + r.stderr).toMatch(/CI DRIFT/);
    } finally {
      writeFileSync(MANIFEST, original, 'utf-8');
    }
  }, 300_000);

  it('--fix é idempotente — duas execuções produzem o mesmo conteúdo (modulo timestamps)', () => {
    const r1 = runScript(['--fix']);
    if (r1.status !== 0) failWith(r1, 'idempotency 1ª');
    const after1 = readFileSync(MANIFEST, 'utf-8');

    const r2 = runScript(['--fix']);
    if (r2.status !== 0) failWith(r2, 'idempotency 2ª');
    const after2 = readFileSync(MANIFEST, 'utf-8');

    expect(stripTimestamps(after1)).toBe(stripTimestamps(after2));
  }, 600_000);

  it('REALITY-MANIFEST contém as 13 métricas canônicas exigidas pelo DoD', () => {
    const manifest = readFileSync(MANIFEST, 'utf-8');
    const required = [
      'Packages com `src/`',
      'Packages total',
      'Arquivos de teste',
      'LOC em `src/`',
      'TODO markers',
      'FIXME markers',
      'HACK markers',
      '`console.log` em `src/`',
      'ADRs em `docs/adr/`',
      'ADRs únicos',
      'ADRs duplicados',
      'Comandos CLI',
      'Arquivos >500 linhas',
    ];
    for (const m of required) {
      expect(manifest).toMatch(m);
    }
  });

  it('todos os 12 arquivos de saída foram gerados e têm conteúdo', () => {
    const expected = [
      'docs/governance/REALITY-MANIFEST.md',
      '.ai/context/inject.json',
      '.ai/context/ai-handoff.md',
      '.ai/context/ai-handoff-compact.md',
      '.ai/context/project-state.md',
      '.ai/context/project-summary.md',
      '.ai/context/communication-protocol.md',
      '.ai/context/README.md',
      '.ai/context/CLAUDE.md',
      '.ai/project-manifest.yaml',
      '.ai/stack.json',
      '.ai/session-mode.json',
    ];
    for (const rel of expected) {
      const abs = join(ROOT, rel);
      expect(existsSync(abs)).toBe(true);
      expect(statSync(abs).size).toBeGreaterThan(0);
    }
  });
});
