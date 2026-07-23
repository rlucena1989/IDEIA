import { saveGateCheckpoint, loadLatestGateCheckpoint, listGateCheckpoints, Checkpoint, StageResult } from '../utils/gate/checkpoint';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('gate - checkpoint', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'checkpoint-'));
  });

  afterEach(() => {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
  });

  const makeCheckpoint = (overrides: Partial<Checkpoint> = {}): Checkpoint => ({
    id: 'cp-001',
    timestamp: '2026-01-01T00:00:00.000Z',
    stages: [
      { stage: 'lint', passed: true, durationMs: 1000, output: 'OK', exitCode: 0 },
    ],
    currentStage: 1,
    completed: false,
    ...overrides,
  });

  it('saveGateCheckpoint deve criar diretorio e arquivos', () => {
    const cp = makeCheckpoint();
    saveGateCheckpoint(tmpDir, cp);
    const cpDir = path.join(tmpDir, '.ai', 'checkpoints');
    expect(fs.existsSync(path.join(cpDir, 'cp-001.json'))).toBe(true);
    expect(fs.existsSync(path.join(cpDir, 'latest.json'))).toBe(true);
  });

  it('saveGateCheckpoint deve persistir dados corretos', () => {
    const cp = makeCheckpoint({ id: 'cp-002', completed: true });
    saveGateCheckpoint(tmpDir, cp);
    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, '.ai', 'checkpoints', 'cp-002.json'), 'utf8'));
    expect(saved.id).toBe('cp-002');
    expect(saved.completed).toBe(true);
    expect(saved.stages).toHaveLength(1);
  });

  it('loadLatestGateCheckpoint deve retornar null quando nao existe', () => {
    const loaded = loadLatestGateCheckpoint(tmpDir);
    expect(loaded).toBeNull();
  });

  it('loadLatestGateCheckpoint deve retornar checkpoint salvo', () => {
    const cp = makeCheckpoint();
    saveGateCheckpoint(tmpDir, cp);
    const loaded = loadLatestGateCheckpoint(tmpDir);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('cp-001');
  });

  it('listGateCheckpoints deve retornar lista vazia para diretorio sem checkpoints', () => {
    const list = listGateCheckpoints(tmpDir);
    expect(list).toEqual([]);
  });

  it('listGateCheckpoints deve listar IDs sem extensao', () => {
    const cp1 = makeCheckpoint({ id: 'cp-a' });
    const cp2 = makeCheckpoint({ id: 'cp-b' });
    saveGateCheckpoint(tmpDir, cp1);
    saveGateCheckpoint(tmpDir, cp2);
    const list = listGateCheckpoints(tmpDir);
    expect(list).toContain('cp-a');
    expect(list).toContain('cp-b');
    expect(list).not.toContain('latest');
  });

  it('loadLatestGateCheckpoint deve retornar null se JSON for invalido', () => {
    const cpDir = path.join(tmpDir, '.ai', 'checkpoints');
    fs.mkdirSync(cpDir, { recursive: true });
    fs.writeFileSync(path.join(cpDir, 'latest.json'), 'not json');
    const loaded = loadLatestGateCheckpoint(tmpDir);
    expect(loaded).toBeNull();
  });
});