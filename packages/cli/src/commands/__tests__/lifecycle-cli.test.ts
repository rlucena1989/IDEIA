import { lifecycleCommand } from '../lifecycle-cli';
import { printHeader, printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../hardening/output-contract');

jest.mock('../../lifecycle/project-lifecycle-orchestrator', () => {
  return {
    ProjectLifecycleOrchestrator: jest.fn(() => ({
      getReport: jest.fn(() => ({
        projectName: 'test-project', currentPhase: 'idea', overallProgress: 14,
        phases: [{ phase: 'idea', status: 'in_progress', artifacts: [], checkpoints: [] }],
        startedAt: '2026-07-22T00:00:00.000Z', elapsedMinutes: 5, status: 'active', errors: [],
      })),
      getPhaseDefinitions: jest.fn(() => [
        { phase: 'idea', label: 'Idea', description: 'Define idea', agents: ['Analyst'], estimatedMinutes: 5 },
        { phase: 'analysis', label: 'Analysis', description: 'Analyze', agents: ['Analyst'], estimatedMinutes: 10 },
      ]),
      getPhaseState: jest.fn(() => ({ phase: 'idea', status: 'in_progress', artifacts: [], checkpoints: [] })),
      getCurrentPhase: jest.fn(() => ({ phase: 'idea', status: 'in_progress', artifacts: [], checkpoints: [] })),
      advance: jest.fn(() => true),
      fail: jest.fn(() => true),
      addCheckpoint: jest.fn(),
      formatReport: jest.fn(() => '=== Lifecycle Report: test-project ==='),
      getEstimatedTimeRemaining: jest.fn(() => 90),
    })),
  };
});

import { getCliVersion } from '../../utils/version';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
});

describe('lifecycleCommand', () => {
  it('should be defined', () => {
    expect(lifecycleCommand).toBeDefined();
  });

  it('should return Command with all subcommands', () => {
    const cmd = lifecycleCommand();
    expect(cmd.name()).toBe('lifecycle');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('init');
    expect(names).toContain('status');
    expect(names).toContain('phases');
    expect(names).toContain('advance');
    expect(names).toContain('checkpoint');
    expect(names).toContain('fail');
  });
});

describe('lifecycleInitAction', () => {
  it('should init lifecycle', async () => {
    const { lifecycleInitAction } = await import('../lifecycle-cli');
    lifecycleInitAction('test-project', {});
    expect(printResult).toHaveBeenCalledWith('Lifecycle initialized', true, expect.any(String));
  });
});

describe('lifecycleStatusAction', () => {
  it('should show status', async () => {
    const { lifecycleStatusAction } = await import('../lifecycle-cli');
    lifecycleStatusAction({});
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Lifecycle Report'));
  });
});

describe('lifecyclePhasesAction', () => {
  it('should list phases', async () => {
    const { lifecyclePhasesAction } = await import('../lifecycle-cli');
    lifecyclePhasesAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Lifecycle Phases'));
  });
});

describe('lifecycleAdvanceAction', () => {
  it('should advance phase', async () => {
    const { lifecycleAdvanceAction } = await import('../lifecycle-cli');
    lifecycleAdvanceAction('idea', {});
    expect(printResult).toHaveBeenCalledWith('Phase completed', true, 'idea');
  });
});

describe('lifecycleAddCheckpointAction', () => {
  it('should add checkpoint', async () => {
    const { lifecycleAddCheckpointAction } = await import('../lifecycle-cli');
    lifecycleAddCheckpointAction('idea', 'Requirements defined', {});
    expect(printResult).toHaveBeenCalledWith('Checkpoint added', true, expect.any(String));
  });
});

describe('lifecycleFailAction', () => {
  it('should fail phase', async () => {
    const { lifecycleFailAction } = await import('../lifecycle-cli');
    lifecycleFailAction('idea', 'Requirements incomplete', {});
    expect(printResult).toHaveBeenCalledWith('Phase failed', false, expect.stringContaining('Requirements'));
  });
});
