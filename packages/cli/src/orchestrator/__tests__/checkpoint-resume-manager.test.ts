jest.mock('@ideia/checkpoint-engine', () => ({
  CheckpointEngine: jest.fn(),
}));

import { CheckpointEngine } from '@ideia/checkpoint-engine';
import { CheckpointResumeManager, createCheckpointResumeManager } from '../checkpoint-resume-manager';

describe('CheckpointResumeManager', () => {
  let manager: CheckpointResumeManager;
  let mockEngine: ReturnType<typeof createMockEngine>;

  function createMockEngine() {
    return {
      save: jest.fn(),
      resume: jest.fn(),
      getLatest: jest.fn(),
      listCheckpoints: jest.fn(),
      resumeManager: {
        canResume: jest.fn(),
        getResumePoint: jest.fn(),
      },
    };
  }

  beforeEach(() => {
    mockEngine = createMockEngine();
    (CheckpointEngine as jest.Mock).mockImplementation(() => mockEngine);
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));
    manager = createCheckpointResumeManager();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saveBeforeDestructive creates a snapshot checkpoint', async () => {
    const expected = { id: 'cp1', type: 'snapshot', version: 1, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', metadata: {} };
    mockEngine.save.mockReturnValue(expected);

    const result = await manager.saveBeforeDestructive('task1', 'delete file', { path: '/tmp/x' });

    expect(mockEngine.save).toHaveBeenCalledWith('task1', 'snapshot', expect.objectContaining({ action: 'delete file' }));
    expect(result).toEqual(expected);
  });

  it('saveMilestone creates a milestone checkpoint', async () => {
    const expected = { id: 'cp2', type: 'milestone', version: 2, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', metadata: {} };
    mockEngine.save.mockReturnValue(expected);

    const result = await manager.saveMilestone('task1', 'phase 1 complete', { progress: 50 });

    expect(mockEngine.save).toHaveBeenCalledWith('task1', 'milestone', expect.objectContaining({ description: 'phase 1 complete' }));
    expect(result).toEqual(expected);
  });

  it('canResume delegates to engine.resumeManager.canResume', () => {
    mockEngine.resumeManager.canResume.mockReturnValue(true);
    expect(manager.canResume('task1')).toBe(true);
    expect(mockEngine.resumeManager.canResume).toHaveBeenCalledWith('task1');

    mockEngine.resumeManager.canResume.mockReturnValue(false);
    expect(manager.canResume('task1')).toBe(false);
  });

  it('resume returns ResumeState from engine', () => {
    const resumeState = {
      lastCheckpoint: { id: 'cp1' },
      resumedFrom: 'checkpoint_1',
      pendingSteps: ['step2'],
      completedSteps: ['step1'],
      context: {},
    };
    mockEngine.resume.mockReturnValue(resumeState);

    const result = manager.resume('task1', ['step1', 'step2']);
    expect(result).toEqual(resumeState);
    expect(mockEngine.resume).toHaveBeenCalledWith('task1', ['step1', 'step2']);
  });

  it('listCheckpoints returns formatted list from engine', () => {
    const checkpoints = [
      { id: 'cp1', type: 'snapshot', version: 1, createdAt: '2026-01-01T00:00:00.000Z', description: 'initial' },
    ];
    mockEngine.listCheckpoints.mockReturnValue(checkpoints);

    const result = manager.listCheckpoints('task1');
    expect(result).toBe(checkpoints);
    expect(mockEngine.listCheckpoints).toHaveBeenCalledWith('task1');
  });

  it('getLatest delegates to engine.getLatest', () => {
    const expected = { id: 'cp1', type: 'snapshot', version: 1, status: 'active', createdAt: '2026-01-01T00:00:00.000Z', metadata: {} };
    mockEngine.getLatest.mockReturnValue(expected);

    const result = manager.getLatest('task1', 'snapshot');
    expect(result).toBe(expected);
    expect(mockEngine.getLatest).toHaveBeenCalledWith('task1', 'snapshot');
  });

  it('getResumePoint delegates to engine.resumeManager.getResumePoint', () => {
    const point = { version: 3, createdAt: '2026-01-01T00:00:00.000Z' };
    mockEngine.resumeManager.getResumePoint.mockReturnValue(point);

    expect(manager.getResumePoint('task1')).toEqual(point);
    expect(mockEngine.resumeManager.getResumePoint).toHaveBeenCalledWith('task1');
  });
});
