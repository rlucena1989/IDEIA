import { tutorialCommand } from '../tutorial';
import { printHeader, printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../hardening/output-contract', () => ({
  createEnvelope: (params: any) => ({
    ok: params.ok,
    command: params.command,
    version: params.version,
    generatedAt: '2024-01-01T00:00:00.000Z',
    requestId: 'test-uuid',
    data: params.data,
    errors: params.errors,
  }),
}));

const mockTutorial = {
  id: 'zero-to-deploy',
  name: 'Zero to Deploy',
  description: 'Complete walkthrough',
  level: 'beginner' as const,
  estimatedMinutes: 45,
  prerequisites: [],
  steps: [
    { id: 'ztd-1', order: 1, title: 'Initialize', description: 'Create project', command: 'ideia init' },
    { id: 'ztd-2', order: 2, title: 'Define Idea', description: 'Describe idea', command: 'ideia idea' },
  ],
  tags: ['beginner'],
  badgeName: 'Zero to Deploy Champion',
};

jest.mock('../../tutorials/tutorial-system', () => {
  return {
    TutorialSystem: jest.fn(() => ({
      listTutorials: jest.fn((level?: string) => level ? [mockTutorial].filter(t => t.level === level) : [mockTutorial]),
      getTutorial: jest.fn((id: string) => id === 'zero-to-deploy' ? mockTutorial : undefined),
      startTutorial: jest.fn((id: string) => id === 'zero-to-deploy'
        ? { tutorialId: id, status: 'in_progress', currentStepIndex: 0, steps: [{ stepId: 'ztd-1', status: 'in_progress', attempts: 0 }] }
        : { error: `Tutorial '${id}' not found` }),
      advanceStep: jest.fn((id: string, stepId: string, success: boolean) => {
        if (stepId === 'ztd-2' && success) {
          return { tutorialId: id, status: 'completed', currentStepIndex: 1, steps: [{ stepId: 'ztd-1', status: 'completed', attempts: 1 }, { stepId: 'ztd-2', status: 'completed', attempts: 1 }] };
        }
        return { tutorialId: id, status: 'in_progress', currentStepIndex: 1, steps: [{ stepId: 'ztd-1', status: 'completed', attempts: 1 }, { stepId: 'ztd-2', status: 'in_progress', attempts: 1 }] };
      }),
      getProgress: jest.fn((id: string) => id === 'zero-to-deploy'
        ? { tutorialId: id, status: 'in_progress', currentStepIndex: 1, steps: [{ stepId: 'ztd-1', status: 'completed', attempts: 1 }, { stepId: 'ztd-2', status: 'in_progress', attempts: 0 }] }
        : undefined),
      getCompletedBadges: jest.fn(() => [{ tutorialId: 'zero-to-deploy', badgeName: 'Zero to Deploy Champion', completedAt: '2026-07-22' }]),
      getOverallStats: jest.fn(() => ({ totalTutorials: 3, completed: 1, inProgress: 0, badges: 1 })),
    })),
  };
});

import { getCliVersion } from '../../utils/version';

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);
  (getCliVersion as jest.Mock).mockReturnValue('1.0.0');
});

describe('tutorialCommand', () => {
  it('should be defined', () => {
    expect(tutorialCommand).toBeDefined();
  });

  it('should return Command with all subcommands', () => {
    const cmd = tutorialCommand();
    expect(cmd.name()).toBe('tutorial');
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('list');
    expect(names).toContain('show');
    expect(names).toContain('start');
    expect(names).toContain('advance');
    expect(names).toContain('progress');
    expect(names).toContain('badges');
    expect(names).toContain('stats');
  });
});

describe('tutorialListAction', () => {
  it('should list tutorials', async () => {
    const { tutorialListAction } = await import('../tutorial');
    tutorialListAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Tutorials'));
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Zero to Deploy'));
  });
});

describe('tutorialShowAction', () => {
  it('should show tutorial details', async () => {
    const { tutorialShowAction } = await import('../tutorial');
    tutorialShowAction('zero-to-deploy', {});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Zero to Deploy'));
  });
});

describe('tutorialStartAction', () => {
  it('should start a tutorial', async () => {
    const { tutorialStartAction } = await import('../tutorial');
    tutorialStartAction('zero-to-deploy', {});
    expect(printResult).toHaveBeenCalledWith('Tutorial started', true, 'zero-to-deploy');
  });
});

describe('tutorialAdvanceAction', () => {
  it('should advance step', async () => {
    const { tutorialAdvanceAction } = await import('../tutorial');
    tutorialAdvanceAction('zero-to-deploy', 'ztd-1', {});
    expect(printResult).toHaveBeenCalledWith('Step completed', true, 'ztd-1');
  });
});

describe('tutorialProgressAction', () => {
  it('should show progress', async () => {
    const { tutorialProgressAction } = await import('../tutorial');
    tutorialProgressAction('zero-to-deploy', {});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Progress'));
  });
});

describe('tutorialBadgesAction', () => {
  it('should show badges', async () => {
    const { tutorialBadgesAction } = await import('../tutorial');
    tutorialBadgesAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Badges'));
  });
});

describe('tutorialStatsAction', () => {
  it('should show stats', async () => {
    const { tutorialStatsAction } = await import('../tutorial');
    tutorialStatsAction({});
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Tutorial Stats'));
  });

  it('should show stats in JSON', async () => {
    const { tutorialStatsAction } = await import('../tutorial');
    tutorialStatsAction({ json: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('totalTutorials'));
  });
});

describe('tutorialListAction', () => {
  it('should filter by level', async () => {
    const { tutorialListAction } = await import('../tutorial');
    tutorialListAction({ level: 'advanced' });
    expect(printHeader).toHaveBeenCalledWith(expect.stringContaining('Tutorials'));
  });

  it('should output JSON', async () => {
    const { tutorialListAction } = await import('../tutorial');
    tutorialListAction({ json: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });
});

describe('tutorialShowAction', () => {
  it('should exit when tutorial not found', async () => {
    const { tutorialShowAction } = await import('../tutorial');
    try { tutorialShowAction('nonexistent', {}); } catch { /* expected */ }
    expect(printResult).toHaveBeenCalledWith('Tutorial not found', false, expect.any(String));
  });

  it('should show JSON output', async () => {
    const { tutorialShowAction } = await import('../tutorial');
    tutorialShowAction('zero-to-deploy', { json: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });
});

describe('tutorialStartAction', () => {
  it('should exit when tutorial not found', async () => {
    const { tutorialStartAction } = await import('../tutorial');
    try { tutorialStartAction('bad-id', {}); } catch { /* expected */ }
    expect(printResult).toHaveBeenCalled();
  });

  it('should output JSON on error', async () => {
    const { tutorialStartAction } = await import('../tutorial');
    try { tutorialStartAction('bad-id', { json: true }); } catch { /* expected */ }
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });

  it('should output JSON on success', async () => {
    const { tutorialStartAction } = await import('../tutorial');
    tutorialStartAction('zero-to-deploy', { json: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });
});

describe('tutorialAdvanceAction', () => {
  it('should handle step advance error', async () => {
    const { tutorialAdvanceAction } = await import('../tutorial');
    try { tutorialAdvanceAction('zero-to-deploy', 'bad-step', {}); } catch { /* expected */ }
    expect(printResult).toHaveBeenCalled();
  });

  it('should output JSON on error', async () => {
    const { tutorialAdvanceAction } = await import('../tutorial');
    try { tutorialAdvanceAction('zero-to-deploy', 'bad-step', { json: true }); } catch { /* expected */ }
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });

  it('should handle --error option', async () => {
    const { tutorialAdvanceAction } = await import('../tutorial');
    tutorialAdvanceAction('zero-to-deploy', 'ztd-1', { error: 'Something broke' });
    expect(printResult).toHaveBeenCalled();
  });

  it('should show completion and badge', async () => {
    const { tutorialAdvanceAction } = await import('../tutorial');
    tutorialAdvanceAction('zero-to-deploy', 'ztd-2', {});
    expect(printResult).toHaveBeenCalledWith('Tutorial completed!', true, 'zero-to-deploy');
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('Badge'));
  });

  it('should output JSON on advance', async () => {
    const { tutorialAdvanceAction } = await import('../tutorial');
    tutorialAdvanceAction('zero-to-deploy', 'ztd-1', { json: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });
});

describe('tutorialProgressAction', () => {
  it('should exit when no progress found', async () => {
    const { tutorialProgressAction } = await import('../tutorial');
    try { tutorialProgressAction('bad-id', {}); } catch { /* expected */ }
    expect(printResult).toHaveBeenCalledWith('No progress', false, expect.any(String));
  });

  it('should output JSON on no progress', async () => {
    const { tutorialProgressAction } = await import('../tutorial');
    try { tutorialProgressAction('bad-id', { json: true }); } catch { /* expected */ }
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });

  it('should output JSON on success', async () => {
    const { tutorialProgressAction } = await import('../tutorial');
    tutorialProgressAction('zero-to-deploy', { json: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });
});

describe('tutorialBadgesAction', () => {
  it('should show badges in JSON', async () => {
    const { tutorialBadgesAction } = await import('../tutorial');
    tutorialBadgesAction({ json: true });
    expect(printLine).toHaveBeenCalledWith(expect.stringContaining('command'));
  });
});
