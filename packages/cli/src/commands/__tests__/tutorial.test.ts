import { tutorialCommand } from '../tutorial';
import { printHeader, printLine, printResult } from '../../utils/output';

jest.mock('../../utils/output');
jest.mock('../../utils/version');
jest.mock('../../hardening/output-contract');

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
  jest.spyOn(process, 'exit').mockImplementation((() => {}) as () => never);
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
});
