import fs from 'node:fs';
import path from 'node:path';
import {
  saveGateCheckpoint,
  loadLatestGateCheckpoint,
  listGateCheckpoints,
  Checkpoint,
} from '../checkpoint';

const TMP_DIR = path.join(__dirname, '..', '..', '..', '..', '..', '..', '..', 'tmp-test-checkpoint');

function makeCheckpoint(overrides: Partial<Checkpoint> = {}): Checkpoint {
  return {
    id: 'test-gate',
    timestamp: '2026-07-26T00:00:00.000Z',
    stages: [],
    currentStage: 0,
    completed: false,
    ...overrides,
  };
}

beforeEach(() => {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

afterAll(() => {
  if (fs.existsSync(TMP_DIR)) {
    fs.rmSync(TMP_DIR, { recursive: true, force: true });
  }
});

describe('saveGateCheckpoint', () => {
  it('should create checkpoint directory and write JSON files', () => {
    const cp = makeCheckpoint({ id: 'gate-123' });
    saveGateCheckpoint(TMP_DIR, cp);

    const cpPath = path.join(TMP_DIR, '.ai', 'checkpoints', 'gate-123.json');
    const latestPath = path.join(TMP_DIR, '.ai', 'checkpoints', 'latest.json');

    expect(fs.existsSync(cpPath)).toBe(true);
    expect(fs.existsSync(latestPath)).toBe(true);

    const saved = JSON.parse(fs.readFileSync(cpPath, 'utf-8'));
    expect(saved.id).toBe('gate-123');
    expect(saved.timestamp).toBe('2026-07-26T00:00:00.000Z');
  });

  it('should write checkpoint content to both files', () => {
    const cp = makeCheckpoint({
      stages: [
        { stage: 'lint', passed: true, durationMs: 100, output: 'ok', exitCode: 0 },
      ],
      currentStage: 1,
      completed: false,
    });

    saveGateCheckpoint(TMP_DIR, cp);

    const latestPath = path.join(TMP_DIR, '.ai', 'checkpoints', 'latest.json');
    const latest = JSON.parse(fs.readFileSync(latestPath, 'utf-8'));

    expect(latest.id).toBe('test-gate');
    expect(latest.stages).toHaveLength(1);
    expect(latest.stages[0].stage).toBe('lint');
    expect(latest.currentStage).toBe(1);
  });
});

describe('loadLatestGateCheckpoint', () => {
  it('should load checkpoint from latest.json', () => {
    const cp = makeCheckpoint({ id: 'gate-456' });
    saveGateCheckpoint(TMP_DIR, cp);

    const loaded = loadLatestGateCheckpoint(TMP_DIR);
    expect(loaded).not.toBeNull();
    expect(loaded!.id).toBe('gate-456');
  });

  it('should return null when no latest.json exists', () => {
    const result = loadLatestGateCheckpoint(TMP_DIR);
    expect(result).toBeNull();
  });

  it('should return null when latest.json is corrupted', () => {
    const dir = path.join(TMP_DIR, '.ai', 'checkpoints');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'latest.json'), '{invalid}', 'utf-8');

    const result = loadLatestGateCheckpoint(TMP_DIR);
    expect(result).toBeNull();
  });

  it('should return null when directory does not exist', () => {
    const result = loadLatestGateCheckpoint(path.join(TMP_DIR, 'nonexistent'));
    expect(result).toBeNull();
  });
});

describe('listGateCheckpoints', () => {
  it('should list checkpoint IDs excluding latest.json', () => {
    const cp1 = makeCheckpoint({ id: 'gate-a' });
    const cp2 = makeCheckpoint({ id: 'gate-b' });
    saveGateCheckpoint(TMP_DIR, cp1);
    saveGateCheckpoint(TMP_DIR, cp2);

    const list = listGateCheckpoints(TMP_DIR);
    expect(list).toContain('gate-a');
    expect(list).toContain('gate-b');
    expect(list).not.toContain('latest');
  });

  it('should return empty array when directory does not exist', () => {
    const result = listGateCheckpoints(path.join(TMP_DIR, 'nope'));
    expect(result).toEqual([]);
  });

  it('should return empty array when only latest.json exists', () => {
    const dir = path.join(TMP_DIR, '.ai', 'checkpoints');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'latest.json'), '{}', 'utf-8');

    const result = listGateCheckpoints(TMP_DIR);
    expect(result).toEqual([]);
  });
});
