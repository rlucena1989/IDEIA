import { TutorialRenderer } from '../src/renderer';
import { Tutorial, TutorialSession, TutorialProgress, CompletionSummary } from '../src/types';

function makeTutorial(): Tutorial {
  return {
    id: 't',
    name: 'Test Tutorial',
    description: 'A test tutorial for render',
    difficulty: 'beginner',
    prerequisites: [],
    steps: [
      { id: 's1', title: 'Start', description: 'Begin here', hint: 'Just start', type: 'shell', command: 'echo start' },
      { id: 's2', title: 'Middle', description: 'Continue', hint: 'Keep going', type: 'shell' },
    ],
    estimatedMinutes: 5,
    tags: ['test'],
  };
}

describe('TutorialRenderer', () => {
  const renderer = new TutorialRenderer();
  const tutorial = makeTutorial();

  it('should render tutorial in JSON format', () => {
    const output = renderer.render(tutorial, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.name).toBe('Test Tutorial');
    expect(parsed.steps).toHaveLength(2);
  });

  it('should render tutorial in CLI format', () => {
    const output = renderer.render(tutorial, 'cli');
    expect(output).toContain('Test Tutorial');
    expect(output).toContain('1. [ ] Start');
  });

  it('should render tutorial in markdown format', () => {
    const output = renderer.render(tutorial, 'markdown');
    expect(output).toContain('# Test Tutorial');
    expect(output).toContain('### 1. Start');
  });

  it('should render progress in JSON', () => {
    const progress: TutorialProgress = {
      tutorialId: 't', currentStep: 1, completed: false, startedAt: 1000, score: 50,
    };
    const output = renderer.renderProgress(progress, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.currentStep).toBe(1);
  });

  it('should render progress in CLI format', () => {
    const progress: TutorialProgress = {
      tutorialId: 't', currentStep: 2, completed: true, startedAt: 1000, completedAt: 2000, score: 90,
    };
    const output = renderer.renderProgress(progress, 'cli');
    expect(output).toContain('COMPLETE');
  });

  it('should render session in JSON', () => {
    const progress: TutorialProgress = { tutorialId: 't', currentStep: 0, completed: false, startedAt: 1000, score: 0 };
    const session: TutorialSession = {
      sessionId: 'sess-1', tutorialId: 't', currentStep: 0, steps: tutorial.steps, progress, hintsUsed: 0, skippedSteps: [],
    };
    const output = renderer.renderSession(session, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.sessionId).toBe('sess-1');
  });

  it('should render session in CLI format', () => {
    const progress: TutorialProgress = { tutorialId: 't', currentStep: 0, completed: false, startedAt: 1000, score: 0 };
    const session: TutorialSession = {
      sessionId: 'sess-1', tutorialId: 't', currentStep: 0, steps: tutorial.steps, progress, hintsUsed: 0, skippedSteps: [],
    };
    const output = renderer.renderSession(session, 'cli');
    expect(output).toContain('Step 1/2');
  });

  it('should render summary in JSON', () => {
    const summary: CompletionSummary = {
      sessionId: 's1', tutorialId: 't', tutorialName: 'Test', completed: true,
      totalSteps: 5, completedSteps: 4, skippedSteps: 1, failedSteps: 0,
      score: 75, timeSpent: 60000, hintsUsed: 2, badges: ['step-completer'],
      startedAt: 1000, completedAt: 61000,
    };
    const output = renderer.renderSummary(summary, 'json');
    const parsed = JSON.parse(output);
    expect(parsed.score).toBe(75);
  });

  it('should render summary in CLI format', () => {
    const summary: CompletionSummary = {
      sessionId: 's1', tutorialId: 't', tutorialName: 'Test', completed: true,
      totalSteps: 5, completedSteps: 5, skippedSteps: 0, failedSteps: 0,
      score: 100, timeSpent: 30000, hintsUsed: 0, badges: ['tutorial-master'],
      startedAt: 1000, completedAt: 31000,
    };
    const output = renderer.renderSummary(summary, 'cli');
    expect(output).toContain('COMPLETED');
    expect(output).toContain('Score: 100');
  });
});
