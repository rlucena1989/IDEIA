import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

jest.mock('node:child_process', () => ({
  spawnSync: jest.fn(),
}));

import { spawnSync } from 'node:child_process';
import { getStages, runStages, StageDef } from '../utils/gate/stages';
import {
  saveGateCheckpoint,
  loadLatestGateCheckpoint,
  listGateCheckpoints,
  Checkpoint,
} from '../utils/gate/checkpoint';
import { runPipeline, printStatus } from '../utils/gate/runner';

const mockedSpawn = spawnSync as unknown as jest.Mock;

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'gate-'));
}

function rmDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
  } catch {
    /* ignore */
  }
}

describe('gate stages', () => {
  it('getStages deve retornar todos os 6 estagios por padrao', () => {
    const stages = getStages();
    expect(stages).toHaveLength(6);
    expect(stages.map((s) => s.name)).toEqual([
      'lint',
      'test',
      'security',
      'build',
      'architecture',
      'deploy-readiness',
    ]);
  });

  it('getStages deve fatiar a partir do estagio informado', () => {
    const stages = getStages('security');
    expect(stages[0].name).toBe('security');
    expect(stages).toHaveLength(4);
  });

  it('getStages deve lancar erro para estagio desconhecido', () => {
    expect(() => getStages('inexistente')).toThrow('not found');
  });

  it('runStages deve passar todos quando spawnSync retorna 0', () => {
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    const results = runStages(getStages(), '/tmp');
    expect(results).toHaveLength(6);
    expect(results.every((r) => r.passed)).toBe(true);
  });

  it('runStages deve parar no primeiro estagio falhando', () => {
    mockedSpawn.mockImplementation((_cmd, args) => ({
      status: args && Array.isArray(args) && args.includes('jest') ? 1 : 0,
      stdout: '',
      stderr: 'erro',
    }));
    const results = runStages(getStages(), '/tmp');
    expect(results).toHaveLength(2);
    expect(results[1].passed).toBe(false);
    expect(results[1].exitCode).toBe(1);
  });

  it('runStages deve tratar excecao de spawnSync como falha', () => {
    mockedSpawn.mockImplementation(() => {
      throw new Error('boom');
    });
    const results = runStages(getStages(), '/tmp');
    expect(results).toHaveLength(1);
    expect(results[0].passed).toBe(false);
    expect(results[0].output).toContain('boom');
  });

  it('runStages deve invocar callback onStage para cada estagio', () => {
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    const seen: string[] = [];
    runStages(getStages(), '/tmp', (r) => seen.push(r.stage));
    expect(seen).toHaveLength(6);
    expect(seen[0]).toBe('lint');
  });

  it('runStages deve respeitar workDir do estagio', () => {
    mockedSpawn.mockImplementation((_cmd, _args, opts) => {
      expect(opts.cwd).toBe('/custom-workdir');
      return { status: 0, stdout: '', stderr: '' };
    });
    const stages: StageDef[] = [{ name: 'x', command: 'echo', args: [], workDir: '/custom-workdir' }];
    const results = runStages(stages, '/tmp');
    expect(results[0].passed).toBe(true);
  });
});

describe('gate checkpoint', () => {
  let dir: string;

  beforeEach(() => {
    dir = tmpDir();
  });
  afterEach(() => rmDir(dir));

  it('saveGateCheckpoint deve escrever latest.json e arquivo por id', () => {
    const cp: Checkpoint = {
      id: 'gate-1',
      timestamp: new Date().toISOString(),
      stages: [],
      currentStage: 0,
      completed: false,
    };
    saveGateCheckpoint(dir, cp);
    expect(fs.existsSync(path.join(dir, '.ai', 'checkpoints', 'gate-1.json'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '.ai', 'checkpoints', 'latest.json'))).toBe(true);
  });

  it('loadLatestGateCheckpoint deve retornar null quando inexistente', () => {
    expect(loadLatestGateCheckpoint(dir)).toBeNull();
  });

  it('loadLatestGateCheckpoint deve retornar checkpoint salvo', () => {
    const cp: Checkpoint = {
      id: 'gate-2',
      timestamp: '2024-01-01',
      stages: [{ stage: 'lint', passed: true, durationMs: 5, output: '', exitCode: 0 }],
      currentStage: 1,
      completed: false,
    };
    saveGateCheckpoint(dir, cp);
    const loaded = loadLatestGateCheckpoint(dir);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('gate-2');
    expect(loaded!.stages).toHaveLength(1);
  });

  it('listGateCheckpoints deve listar ids exceto latest', () => {
    saveGateCheckpoint(dir, { id: 'gate-a', timestamp: '', stages: [], currentStage: 0, completed: false });
    saveGateCheckpoint(dir, { id: 'gate-b', timestamp: '', stages: [], currentStage: 0, completed: false });
    const list = listGateCheckpoints(dir);
    expect(list).toContain('gate-a');
    expect(list).toContain('gate-b');
    expect(list).not.toContain('latest');
  });

  it('listGateCheckpoints deve retornar vazio quando diretorio ausente', () => {
    expect(listGateCheckpoints(path.join(dir, 'nope'))).toEqual([]);
  });
});

describe('gate runner', () => {
  let dir: string;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    dir = tmpDir();
    mockedSpawn.mockReset();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => undefined) as any);
  });
  afterEach(() => {
    exitSpy.mockRestore();
    rmDir(dir);
  });

  it('runPipeline deve chamar process.exit(0) quando todos estagios passam', () => {
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    runPipeline(dir);
    expect(exitSpy).toHaveBeenCalledWith(0);
    const cp = loadLatestGateCheckpoint(dir);
    expect(cp!.completed).toBe(true);
  });

  it('runPipeline deve chamar process.exit com falhas quando estagio falha', () => {
    mockedSpawn.mockImplementation(() => ({ status: 1, stdout: '', stderr: 'err' }));
    runPipeline(dir);
    expect(exitSpy).toHaveBeenCalledWith(1);
    const cp = loadLatestGateCheckpoint(dir);
    expect(cp!.completed).toBe(false);
  });

  it('runPipeline deve respeitar startStage', () => {
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    runPipeline(dir, 'build');
    const cp = loadLatestGateCheckpoint(dir);
    expect(cp!.stages[0].stage).toBe('build');
  });

  it('runPipeline com json deve imprimir checkpoint serializado', () => {
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    runPipeline(dir, undefined, false, true);
    expect(logSpy).toHaveBeenCalled();
    logSpy.mockRestore();
  });

  it('runPipeline resume deve iniciar do inicio quando nao ha checkpoint', () => {
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    runPipeline(dir, undefined, true);
    expect(exitSpy).toHaveBeenCalledWith(0);
    const cp = loadLatestGateCheckpoint(dir);
    expect(cp!.stages[0].stage).toBe('lint');
  });

  it('runPipeline resume deve retornar cedo quando checkpoint completo', () => {
    saveGateCheckpoint(dir, {
      id: 'gate-done',
      timestamp: '',
      stages: [{ stage: 'lint', passed: true, durationMs: 1, output: '', exitCode: 0 }],
      currentStage: 6,
      completed: true,
    });
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    runPipeline(dir, undefined, true);
    expect(exitSpy).not.toHaveBeenCalled();
  });

  it('runPipeline resume deve reiniciar do estagio falho do checkpoint', () => {
    saveGateCheckpoint(dir, {
      id: 'gate-fail',
      timestamp: '',
      stages: [
        { stage: 'lint', passed: true, durationMs: 1, output: '', exitCode: 0 },
        { stage: 'test', passed: false, durationMs: 1, output: '', exitCode: 1 },
      ],
      currentStage: 2,
      completed: false,
    });
    mockedSpawn.mockReturnValue({ status: 0, stdout: 'ok', stderr: '' });
    runPipeline(dir, undefined, true);
    const cp = loadLatestGateCheckpoint(dir);
    expect(cp!.stages[0].stage).toBe('test');
  });

  it('printStatus deve informar quando nao ha checkpoint', () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    printStatus(dir);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Nenhum checkpoint'));
    logSpy.mockRestore();
  });

  it('printStatus deve exibir estagios do checkpoint existente', () => {
    saveGateCheckpoint(dir, {
      id: 'gate-x',
      timestamp: '2024-01-01',
      stages: [{ stage: 'lint', passed: true, durationMs: 3, output: '', exitCode: 0 }],
      currentStage: 1,
      completed: false,
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    printStatus(dir);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Quality Gate Status'));
    logSpy.mockRestore();
  });

  it('printStatus com json deve imprimir checkpoint serializado', () => {
    saveGateCheckpoint(dir, {
      id: 'gate-j',
      timestamp: '2024-01-01',
      stages: [],
      currentStage: 0,
      completed: true,
    });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
    printStatus(dir, true);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('"id": "gate-j"'));
    logSpy.mockRestore();
  });
});
