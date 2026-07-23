import { describe, it, expect } from '@jest/globals';
import { TutorialSystem } from '../tutorial-system';

describe('tutorial-system', () => {
  it('should list all tutorials', () => {
    const ts = new TutorialSystem();
    const tutorials = ts.listTutorials();
    expect(tutorials.length).toBeGreaterThan(0);
  });

  it('should filter tutorials by level', () => {
    const ts = new TutorialSystem();
    const beginner = ts.listTutorials('beginner');
    beginner.forEach(t => expect(t.level).toBe('beginner'));
  });

  it('should get a specific tutorial', () => {
    const ts = new TutorialSystem();
    const tutorial = ts.getTutorial('zero-to-deploy');
    expect(tutorial).toBeDefined();
    expect(tutorial!.name).toBe('Zero to Deploy');
  });

  it('should return undefined for unknown tutorial', () => {
    const ts = new TutorialSystem();
    expect(ts.getTutorial('nonexistent')).toBeUndefined();
  });

  it('should start a tutorial', () => {
    const ts = new TutorialSystem();
    const result = ts.startTutorial('zero-to-deploy');
    if ('error' in result) {
      expect(result.error).toBeUndefined();
    } else {
      expect(result.status).toBe('in_progress');
      expect(result.steps[0].status).toBe('in_progress');
    }
  });

  it('should return error for unknown tutorial start', () => {
    const ts = new TutorialSystem();
    const result = ts.startTutorial('nonexistent');
    expect('error' in result).toBe(true);
  });

  it('should advance through tutorial steps', () => {
    const ts = new TutorialSystem();
    const started = ts.startTutorial('zero-to-deploy');
    if ('error' in started) return;

    const tutorial = ts.getTutorial('zero-to-deploy')!;

    for (let i = 0; i < tutorial.steps.length; i++) {
      const step = tutorial.steps[i];
      const progress = ts.advanceStep('zero-to-deploy', step.id, true);
      if ('error' in progress) {
        expect(progress.error).toBeUndefined();
        return;
      }
      if (i < tutorial.steps.length - 1) {
        expect(progress.currentStepIndex).toBe(i + 1);
      } else {
        expect(progress.status).toBe('completed');
      }
    }
  });

  it('should handle step failure', () => {
    const ts = new TutorialSystem();
    ts.startTutorial('zero-to-deploy');
    const progress = ts.advanceStep('zero-to-deploy', 'ztd-1', false, 'Command failed');
    if (!('error' in progress)) {
      expect(progress.status).toBe('failed');
      expect(progress.steps[0].status).toBe('failed');
    }
  });

  it('should return badges on completion', () => {
    const ts = new TutorialSystem();
    ts.startTutorial('zero-to-deploy');
    const tutorial = ts.getTutorial('zero-to-deploy')!;
    for (const step of tutorial.steps) {
      ts.advanceStep('zero-to-deploy', step.id, true);
    }
    const badges = ts.getCompletedBadges();
    expect(badges.length).toBeGreaterThan(0);
    expect(badges[0].badgeName).toBe('Zero to Deploy Champion');
  });

  it('should reset tutorial progress', () => {
    const ts = new TutorialSystem();
    ts.startTutorial('zero-to-deploy');
    ts.resetTutorial('zero-to-deploy');
    expect(ts.getProgress('zero-to-deploy')).toBeUndefined();
  });

  it('should return overall stats', () => {
    const ts = new TutorialSystem();
    const stats = ts.getOverallStats();
    expect(stats.totalTutorials).toBeGreaterThan(0);
    expect(stats.completed).toBe(0);
  });

  it('should register custom tutorials', () => {
    const ts = new TutorialSystem();
    ts.registerTutorial({
      id: 'custom-tutorial',
      name: 'Custom',
      description: 'A custom tutorial',
      level: 'advanced',
      estimatedMinutes: 10,
      prerequisites: [],
      steps: [{ id: 'c1', order: 1, title: 'Step 1', description: 'Do something' }],
      tags: ['custom'],
    });
    expect(ts.getTutorial('custom-tutorial')).toBeDefined();
    expect(ts.listTutorials().length).toBe(4);
  });
});
