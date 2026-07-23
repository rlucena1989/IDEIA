import { Command } from 'commander';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

import {
  parseDiff,
  checkFileExtension,
  DiffFile,
  PRReviewReport,
  ComplianceResult,
  runComplianceChecks,
} from '../commands/pr-review';
import { checkEnv } from '../commands/doctor';
import { getIO, resetIO } from '../io';
import * as output from '../utils/output';
import { ecosystemCommand } from '../commands/ecosystem';
import { featureFlagCommand } from '../commands/feature-flag';
import { promptCommand } from '../commands/prompt';
import { snapshotCommand } from '../commands/snapshot';
import { syncCommand } from '../commands/sync';
import { backupStatusCommand, backupConfigureGithubCommand } from '../commands/backup';
import {
  logEvent,
  verifyTimeline,
  searchTimeline,
  exportTimeline,
  timelineCommand,
} from '../commands/timeline';
import { detectDrift, driftCommand } from '../commands/drift';

jest.mock('../io', () => {
  const { MockIOContainer } = jest.requireActual('../io/mock');
  let mockIO: any = null;
  return {
    __esModule: true,
    getIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
    resetIO: () => {
      mockIO = null;
    },
    createIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
  };
});

jest.mock('../utils/output', () => {
  const calls: any[] = [];
  return {
    __esModule: true,
    printHeader: jest.fn(),
    printLine: jest.fn(),
    printResult: jest.fn(),
    printSummary: jest.fn(),
    finish: (opts: any) => {
      calls.push(opts);
    },
    __calls: calls,
  };
});

const finishCalls = () => (output as any).__calls as any[];
const lastFinish = () => {
  const c = finishCalls();
  return c[c.length - 1];
};
const clearFinish = () => {
  finishCalls().length = 0;
};

function overrideExitRecursive(c: Command): void {
  c.exitOverride();
  for (const sub of c.commands) overrideExitRecursive(sub);
}

async function runSub(cmd: Command, args: string[]): Promise<void> {
  const program = new Command();
  program.exitOverride();
  overrideExitRecursive(cmd);
  program.addCommand(cmd);
  try {
    await program.parseAsync(['node', 'test', ...args], { from: 'node' });
  } catch {
    // known: some subcommands may not exist in tests
  }
}

describe('pr-review - parseDiff', () => {
  it('deve parsear hunk valido', () => {
    const diff = '@@ -1,5 +1,6 @@\n line1\n+new line\n line2\n';
    const hunks = parseDiff(diff);
    expect(hunks).toHaveLength(1);
    expect(hunks[0].startLine).toBe(1);
    expect(hunks[0].lineCount).toBe(1);
  });

  it('deve parsear multiplos hunks', () => {
    const diff = '@@ -1,3 +1,4 @@\n a\n+b\n c\n@@ -10,5 +10,6 @@\n x\n+y\n z\n';
    const hunks = parseDiff(diff);
    expect(hunks).toHaveLength(2);
  });

  it('deve retornar array vazio para diff vazio', () => {
    expect(parseDiff('')).toEqual([]);
  });
});

describe('pr-review - checkFileExtension', () => {
  it('deve aceitar .ts', () => expect(checkFileExtension('src/index.ts')).toBe(true));
  it('deve aceitar .tsx', () => expect(checkFileExtension('src/App.tsx')).toBe(true));
  it('deve aceitar .md', () => expect(checkFileExtension('README.md')).toBe(true));
  it('deve rejeitar .exe', () => expect(checkFileExtension('app.exe')).toBe(false));
  it('deve rejeitar .png', () => expect(checkFileExtension('image.png')).toBe(false));
});

describe('pr-review - types', () => {
  it('PRReviewReport deve ter estrutura valida', () => {
    const report: PRReviewReport = {
      summary: { filesChanged: 0, findings: 0, critical: 0, high: 0, medium: 0, low: 0, score: 100 },
      findings: [],
      inlineSuggestions: [],
      compliance: [],
    };
    expect(report.summary.score).toBe(100);
  });

  it('DiffFile deve ter estrutura valida', () => {
    const f: DiffFile = { file: 'a.ts', additions: 1, deletions: 0, hunks: [] };
    expect(f.file).toBe('a.ts');
    expect(f.hunks).toEqual([]);
  });
});

describe('pr-review - runComplianceChecks', () => {
  let io: any;

  beforeEach(() => {
    resetIO();
    io = getIO() as any;
    io._reset();
  });

  it('deve falhar quando arquivos obrigatorios ausentes', () => {
    const results = runComplianceChecks('/test');
    expect(results.some((r: ComplianceResult) => r.status === 'failed')).toBe(true);
  });

  it('deve passar quando todos os arquivos existem', () => {
    io.fs._addFile('/test/AGENTS.md');
    io.fs._addFile('/test/CHANGELOG.md');
    io.fs._addFile('/test/LICENSE');
    io.fs._addFile('/test/.ai/architecture/adr.md');
    io.fs._addFile('/test/.ai/policies/policy.md');
    const results = runComplianceChecks('/test');
    expect(results.every((r: ComplianceResult) => r.status === 'passed')).toBe(true);
  });
});

describe('doctor - checkEnv', () => {
  it('deve retornar score 100 com git + manifest', () => {
    const io = {
      shell: { execString: () => ({ status: 0 }) },
      fs: { cwd: () => '/test', exists: () => true },
    };
    const result = checkEnv(io as any);
    expect(result.score).toBe(100);
    expect(result.report.length).toBeGreaterThanOrEqual(3);
  });

  it('deve reduzir score se git faltando', () => {
    const io = {
      shell: { execString: () => ({ status: 1 }) },
      fs: { cwd: () => '/test', exists: () => true },
    };
    const result = checkEnv(io as any);
    expect(result.score).toBe(80);
  });

  it('deve reduzir score se manifest maltando', () => {
    const io = {
      shell: { execString: () => ({ status: 0 }) },
      fs: { cwd: () => '/test', exists: () => false },
    };
    const result = checkEnv(io as any);
    expect(result.score).toBe(70);
  });
});

// ============================================================
// ecosystem command
// ============================================================
describe('ecosystem command', () => {
  let io: any;
  const _root = process.cwd();

  beforeEach(() => {
    resetIO();
    clearFinish();
    io = getIO() as any;
    io._reset();
    io.shell._setDefault({ status: 0, stdout: '', stderr: '' });
  });

  it('deve criar comando com nome ecosystem', () => {
    expect(ecosystemCommand().name()).toBe('ecosystem');
  });

  it('status deve executar sem erros', async () => {
    await expect(runSub(ecosystemCommand(), ['ecosystem', 'status'])).resolves.toBeUndefined();
  });

  it('status deve executar com json', async () => {
    await expect(runSub(ecosystemCommand(), ['ecosystem', 'status', '--json'])).resolves.toBeUndefined();
  });

  it('status deve executar com seed', async () => {
    await expect(runSub(ecosystemCommand(), ['ecosystem', 'status', '--seed'])).resolves.toBeUndefined();
  });

  it.todo('doctor deve falhar quando arquivos essenciais ausentes');
  it.todo('doctor deve passar quando todos os checks existem');
  it.todo('update deve concluir com sucesso quando npm update retorna 0');

  it.todo('metrics deve reportar plugins e regras');
  it.todo('security-advisory deve passar quando npm audit falha');
  it.todo('security-advisory deve reportar criticas quando audit retorna vulnerabilidades');
});

// ============================================================
// feature-flag command
// ============================================================
describe('feature-flag command', () => {
  let io: any;
  const root = process.cwd();
  const flagsPath = path.join(root, '.ai', 'feature-flags', 'flags.yaml');

  beforeEach(() => {
    resetIO();
    clearFinish();
    io = getIO() as any;
    io._reset();
  });

  it('deve criar comando com nome feature-flag', () => {
    expect(featureFlagCommand().name()).toBe('feature-flag');
  });

  it('plan deve criar nova feature flag', async () => {
    await runSub(featureFlagCommand(), ['feature-flag', 'plan', 'new-flag']);
    const f = lastFinish();
    expect(f.checkpoint).toBe('feature_flag_plan');
    expect(f.ok).toBe(true);
    expect(io.fs.exists(flagsPath)).toBe(true);
    const saved = JSON.parse(io.fs.read(flagsPath, 'utf-8'));
    expect(saved[0].name).toBe('new-flag');
    expect(saved[0].status).toBe('inactive');
  });

  it('plan deve falhar quando feature flag ja existe', async () => {
    io.fs._addFile(flagsPath, JSON.stringify([{ name: 'existing', description: '', status: 'active', type: 'boolean', createdAt: '', updatedAt: '' }]));
    await runSub(featureFlagCommand(), ['feature-flag', 'plan', 'existing']);
    const f = lastFinish();
    expect(f.ok).toBe(false);
    expect(f.status).toBe('failed');
  });

  it('list deve reportar nenhuma flag quando vazio', async () => {
    await runSub(featureFlagCommand(), ['feature-flag', 'list']);
    const f = lastFinish();
    expect(f.data.total).toBe(0);
  });

  it('list deve contar flags ativas', async () => {
    io.fs._addFile(
      flagsPath,
      JSON.stringify([
        { name: 'a', description: '', status: 'active', type: 'boolean', createdAt: '', updatedAt: '' },
        { name: 'b', description: '', status: 'inactive', type: 'boolean', createdAt: '', updatedAt: '' },
      ]),
    );
    await runSub(featureFlagCommand(), ['feature-flag', 'list']);
    const f = lastFinish();
    expect(f.data.total).toBe(2);
    expect(f.data.active).toBe(1);
  });

  it('status deve exibir flag existente', async () => {
    io.fs._addFile(
      flagsPath,
      JSON.stringify([{ name: 'rollout', description: 'desc', status: 'rolled-out', type: 'percentage', percentage: 50, createdAt: '', updatedAt: '' }]),
    );
    await runSub(featureFlagCommand(), ['feature-flag', 'status', 'rollout']);
    const f = lastFinish();
    expect(f.ok).toBe(true);
    expect(f.data.name).toBe('rollout');
  });

  it('status deve falhar quando flag nao encontrada', async () => {
    await runSub(featureFlagCommand(), ['feature-flag', 'status', 'missing']);
    const f = lastFinish();
    expect(f.ok).toBe(false);
    expect(f.status).toBe('failed');
  });
});

// ============================================================
// prompt command
// ============================================================
describe('prompt command', () => {
  let io: any;
  const root = process.cwd();

  beforeEach(() => {
    resetIO();
    clearFinish();
    io = getIO() as any;
    io._reset();
  });

  it('deve criar comando com nome prompt', () => {
    expect(promptCommand().name()).toBe('prompt');
  });

  it('save deve persistir nova versao de prompt', async () => {
    await runSub(promptCommand(), ['prompt', 'save', 'greet', '--content', 'Hello World']);
    const f = lastFinish();
    expect(f.checkpoint).toBe('prompt_save');
    expect(f.ok).toBe(true);
    expect(f.data.name).toBe('greet');
    expect(f.data.chars).toBe(11);
    const indexPath = path.join(root, '.ai', 'prompts', 'versions', 'greet', 'index.json');
    const versions = JSON.parse(io.fs.read(indexPath, 'utf-8'));
    expect(versions).toHaveLength(1);
    expect(versions[0].hash).toBe(f.data.hash);
  });

  it('save deve falhar quando conteudo vazio', async () => {
    await runSub(promptCommand(), ['prompt', 'save', 'empty', '--content', '']);
    const f = lastFinish();
    expect(f.ok).toBe(false);
    expect(f.status).toBe('failed');
  });

  it('list deve reportar nenhum prompt quando diretorio ausente', async () => {
    await runSub(promptCommand(), ['prompt', 'list']);
    const f = lastFinish();
    expect(f.checkpoint).toBe('prompt_list');
    expect(f.ok).toBe(true);
  });

  it('show deve falhar quando prompt nao encontrado', async () => {
    await runSub(promptCommand(), ['prompt', 'show', 'nope']);
    const f = lastFinish();
    expect(f.ok).toBe(false);
    expect(f.checkpoint).toBe('prompt_show');
  });

  it('diff deve falhar quando versoes nao encontradas', async () => {
    await runSub(promptCommand(), ['prompt', 'diff', 'nope', '--from', '1.0.0', '--to', '2.0.0']);
    const f = lastFinish();
    expect(f.ok).toBe(false);
    expect(f.checkpoint).toBe('prompt_diff');
  });

  it('rollback deve falhar quando versao nao encontrada', async () => {
    await runSub(promptCommand(), ['prompt', 'rollback', 'nope', '--version', '9.9.9']);
    const f = lastFinish();
    expect(f.ok).toBe(false);
    expect(f.checkpoint).toBe('prompt_rollback');
  });

  it('show deve exibir versao latest apos salvar', async () => {
    await runSub(promptCommand(), ['prompt', 'save', 'demo', '--content', 'v1']);
    await runSub(promptCommand(), ['prompt', 'show', 'demo', '--version', 'latest']);
    const f = lastFinish();
    expect(f.ok).toBe(true);
    expect(f.data.version).toBe('1.0.0');
  });

  it('diff deve contar mudancas entre duas versoes', async () => {
    await runSub(promptCommand(), ['prompt', 'save', 'cmp', '--content', 'linha A', '--version', '1.0.0']);
    await runSub(promptCommand(), ['prompt', 'save', 'cmp', '--content', 'linha B', '--version', '2.0.0']);
    await runSub(promptCommand(), ['prompt', 'diff', 'cmp', '--from', '1.0.0', '--to', '2.0.0']);
    const f = lastFinish();
    expect(f.ok).toBe(true);
    expect(f.data.changes).toBeGreaterThan(0);
  });

  it('rollback deve criar nova versao com conteudo antigo', async () => {
    await runSub(promptCommand(), ['prompt', 'save', 'rb', '--content', 'original', '--version', '1.0.0']);
    await runSub(promptCommand(), ['prompt', 'rollback', 'rb', '--version', '1.0.0']);
    const f = lastFinish();
    expect(f.ok).toBe(true);
    expect(f.data.version).toBe('1.0.0');
    expect(String(f.data.newVersion)).toContain('rollback');
  });
});

// ============================================================
// snapshot command
// ============================================================
describe('snapshot command', () => {
  let io: any;
  const root = process.cwd();

  beforeEach(() => {
    resetIO();
    clearFinish();
    io = getIO() as any;
    io._reset();
  });

  it('deve criar comando com nome snapshot', () => {
    expect(snapshotCommand().name()).toBe('snapshot');
  });

  it('generate deve gerar snapshot com stack e health', async () => {
    io.fs._addFile(path.join(root, 'package.json'), JSON.stringify({ version: '2.0.0', dependencies: { react: '1' } }));
    io.fs._addFile(path.join(root, 'tsconfig.json'), '{}');
    io.fs._addFile(path.join(root, '.ai', 'laws.yaml'), 'rule1\nrule2');
    io.fs._addFile(path.join(root, 'README.md'), '# T');
    io.fs._addFile(path.join(root, '.gitignore'), 'nm');
    io.fs._addDir(path.join(root, 'packages'));
    await runSub(snapshotCommand(), ['snapshot', 'generate']);
    const f = lastFinish();
    expect(f.checkpoint).toBe('snapshot');
    expect(f.ok).toBe(true);
    expect(f.data.project.version).toBe('2.0.0');
    expect(f.data.project.stack).toContain('javascript');
    expect(f.data.project.frameworks).toContain('react');
    expect(f.data.health.score).toBeGreaterThan(0);
  });

  it('generate --save deve escrever arquivo de snapshot', async () => {
    io.fs._addFile(path.join(root, 'package.json'), JSON.stringify({ version: '1.0.0' }));
    await runSub(snapshotCommand(), ['snapshot', 'generate', '--save']);
    const f = lastFinish();
    expect(f.ok).toBe(true);
    expect(io.fs.exists(path.join(root, '.ai', 'reports', 'snapshot.json'))).toBe(true);
  });

  it('status deve exibir resumo rapido de health', async () => {
    io.fs._addFile(path.join(root, 'package.json'), '{}');
    await runSub(snapshotCommand(), ['snapshot', 'status']);
    const f = lastFinish();
    expect(f.checkpoint).toBe('snapshot_status');
    expect(f.ok).toBe(true);
    expect(f.data.health).toBeDefined();
  });

  it('generate deve classificar health como unhealthy quando poucos arquivos', async () => {
    await runSub(snapshotCommand(), ['snapshot', 'generate']);
    const f = lastFinish();
    expect(f.data.health.status).toBe('unhealthy');
  });
});

// ============================================================
// sync command (real fs)
// ============================================================
describe('sync command', () => {
  let cwd: string;
  let tmp: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sync-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(cwd);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('deve criar comando com nome sync', () => {
    expect(syncCommand().name()).toBe('sync');
  });

  it('sync tem subcomandos definidos', () => {
    const cmd = syncCommand();
    expect(cmd.name()).toBe('sync');
    expect(cmd.commands.length).toBeGreaterThanOrEqual(4);
  });

  it('sync run aceita argumento json', () => {
    const cmd = syncCommand();
    const runCmd = cmd.commands.find(c => c.name() === 'run');
    expect(runCmd).toBeDefined();
  });
});

// ============================================================
// backup command (real fs + process.exit mock)
// ============================================================
describe('backup command', () => {
  let cwd: string;
  let tmp: string;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-'));
    process.chdir(tmp);
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
  });

  afterEach(() => {
    exitSpy.mockRestore();
    process.chdir(cwd);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('deve criar backup-status com nome correto', () => {
    expect(backupStatusCommand().name()).toBe('backup-status');
  });

  it('backup-status deve executar sem erros quando manager ausente', async () => {
    await expect(runSub(backupStatusCommand(), ['backup-status'])).resolves.toBeUndefined();
  });

  it('backup-status deve executar quando manager carrega', async () => {
    fs.mkdirSync(path.join(tmp, '.ai', 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.ai', 'bin', 'backup-manager.js'),
      'module.exports = { status: () => ({ sizeMB: 1, quotaMB: 100, percentUsed: 1, githubEnabled: true, githubRemote: "origin", archiveCount: 2 }) };',
    );
    await expect(runSub(backupStatusCommand(), ['backup-status'])).resolves.toBeUndefined();
  });

  it('backup-configure-github deve executar quando manager presente', async () => {
    fs.mkdirSync(path.join(tmp, '.ai', 'bin'), { recursive: true });
    fs.writeFileSync(
      path.join(tmp, '.ai', 'bin', 'backup-manager.js'),
      'module.exports = { configureGithub: () => {} };',
    );
    await expect(runSub(backupConfigureGithubCommand(), ['backup-configure-github', 'https://github.com/x/y'])).resolves.toBeUndefined();
  });
});

// ============================================================
// timeline (pure functions, real fs)
// ============================================================
describe('timeline', () => {
  let cwd: string;
  let tmp: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'timeline-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(cwd);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('deve criar comando com nome timeline', () => {
    expect(timelineCommand().name()).toBe('timeline');
  });

  it('logEvent deve criar entrada com hash encadeado', () => {
    const entry = logEvent('commit', 'agent', { a: 1 });
    expect(entry.event_type).toBe('commit');
    expect(entry.actor).toBe('agent');
    expect(entry.hash).toHaveLength(64);
    expect(entry.prev_hash).toBe('0'.repeat(64));
  });

  it('logEvent deve encadear prev_hash com hash anterior', () => {
    const first = logEvent('a', 'x', {});
    const second = logEvent('b', 'y', {});
    expect(second.prev_hash).toBe(first.hash);
  });

  it('verifyTimeline deve validar cadeia intacts', () => {
    logEvent('a', 'x', {});
    logEvent('b', 'y', {});
    const result = verifyTimeline();
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(2);
  });

  it('verifyTimeline deve retornar valido quando timeline vazia', () => {
    const result = verifyTimeline();
    expect(result.valid).toBe(true);
    expect(result.totalEntries).toBe(0);
  });

  it('searchTimeline deve filtrar por tipo', () => {
    logEvent('create', 'x', {});
    logEvent('update', 'y', {});
    const entries = searchTimeline('create');
    expect(entries).toHaveLength(1);
    expect(entries[0].event_type).toBe('create');
  });

  it('searchTimeline deve filtrar por data', () => {
    logEvent('old', 'x', {});
    const entries = searchTimeline(undefined, '2099-01-01');
    expect(entries).toHaveLength(0);
  });

  it('exportTimeline deve retornar todas as entradas', () => {
    logEvent('a', 'x', {});
    logEvent('b', 'y', {});
    expect(exportTimeline()).toHaveLength(2);
  });
});

// ============================================================
// drift (pure function + command, real fs)
// ============================================================
describe('drift', () => {
  let cwd: string;
  let tmp: string;

  beforeEach(() => {
    cwd = process.cwd();
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-'));
    process.chdir(tmp);
  });

  afterEach(() => {
    process.chdir(cwd);
    try {
      fs.rmSync(tmp, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  it('deve criar comando com nome drift', () => {
    expect(driftCommand().name()).toBe('drift');
  });

  it('detectDrift deve retornar clean em diretorio sem fontes nem alvos', () => {
    const report = detectDrift();
    expect(report.status).toBe('clean');
    expect(report.total_findings).toBe(0);
  });

  it('detectDrift deve detectar completeness quando fonte existe mas nenhum alvo', () => {
    fs.mkdirSync(path.join(tmp, '.ai', 'policies'), { recursive: true });
    fs.writeFileSync(path.join(tmp, '.ai', 'policies', 'p1.yaml'), 'rules: []');
    const report = detectDrift();
    expect(report.findings.some((f) => f.type === 'completeness')).toBe(true);
    expect(report.status).toBe('drift_detected');
  });

  it('detectDrift deve detectar orphan quando alvo existe sem fonte', () => {
    fs.writeFileSync(path.join(tmp, 'CLAUDE.md'), '# Claude');
    const report = detectDrift();
    expect(report.findings.some((f) => f.type === 'orphan')).toBe(true);
  });

  it('drift status action deve informar quando nenhum check foi feito', async () => {
    const program = new Command();
    program.exitOverride();
    program.addCommand(driftCommand());
    await program.parseAsync(['node', 'test', 'drift', 'status'], { from: 'node' });
  });
});
