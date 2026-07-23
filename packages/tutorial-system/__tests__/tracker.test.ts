import { ProgressTracker } from '../src/tracker';
import { TutorialProgress } from '../src/types';

describe('ProgressTracker', () => {
  let tracker: ProgressTracker;

  beforeEach(() => {
    tracker = new ProgressTracker();
  });

  it('should save and retrieve progress', () => {
    const progress: TutorialProgress = {
      tutorialId: 'test',
      currentStep: 2,
      completed: false,
      startedAt: Date.now(),
      score: 50,
    };
    tracker.saveProgress(progress);
    const retrieved = tracker.getProgress('default-user', 'test');
    expect(retrieved).toBeDefined();
    expect(retrieved!.currentStep).toBe(2);
    expect(retrieved!.score).toBe(50);
  });

  it('should return undefined for unknown progress', () => {
    const result = tracker.getProgress('unknown-user', 'unknown');
    expect(result).toBeUndefined();
  });

  it('should list all progress for a user', () => {
    tracker.saveProgress({ tutorialId: 't1', currentStep: 1, completed: false, startedAt: Date.now(), score: 30 });
    tracker.saveProgress({ tutorialId: 't2', currentStep: 3, completed: true, startedAt: Date.now(), completedAt: Date.now(), score: 90 });
    const all = tracker.getAllProgress('default-user');
    expect(all).toHaveLength(2);
  });

  it('should compute completion rate as 1 when completed', () => {
    tracker.saveProgress({ tutorialId: 't', currentStep: 1, completed: true, startedAt: Date.now(), completedAt: Date.now(), score: 100 });
    const rate = tracker.getCompletionRate('t');
    expect(rate).toBe(1);
  });

  it('should return 0 completion rate when no one started', () => {
    expect(tracker.getCompletionRate('ghost')).toBe(0);
  });

  it('should award and retrieve badges', () => {
    tracker.awardBadge('default-user', { id: 'b1', name: 'Badge 1', description: 'First badge', earnedAt: new Date().toISOString() });
    const badges = tracker.getBadges('default-user');
    expect(badges).toHaveLength(1);
    expect(badges[0].id).toBe('b1');
  });

  it('should not duplicate badges', () => {
    const badge = { id: 'b1', name: 'B1', description: 'D', earnedAt: 'now' };
    tracker.awardBadge('user', badge);
    tracker.awardBadge('user', badge);
    expect(tracker.getBadges('user')).toHaveLength(1);
  });

  it('should reset progress for a tutorial', () => {
    tracker.saveProgress({ tutorialId: 't1', currentStep: 2, completed: false, startedAt: Date.now(), score: 50 });
    tracker.resetProgress('default-user', 't1');
    expect(tracker.getProgress('default-user', 't1')).toBeUndefined();
  });
});
