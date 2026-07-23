import { describe, it, expect } from '@jest/globals';
import { captureLesson } from '../lesson-capture';

describe('lesson-capture', () => {
  it('captureLesson should be defined', () => {
    expect(captureLesson).toBeDefined();
  });

  it('should create a lesson with all fields', () => {
    const lesson = captureLesson({
      summary: 'Policy blocked valid change',
      context: 'Deploy v2.1 was blocked by deploy-freeze policy',
      outcome: 'Rollback avoided',
      recommendation: 'Review policy before Friday deployments',
    });
    expect(lesson.lessonId).toContain('lesson-');
    expect(lesson.summary).toBe('Policy blocked valid change');
    expect(lesson.context).toContain('Deploy v2.1');
    expect(lesson.outcome).toBe('Rollback avoided');
    expect(lesson.recommendation).toContain('Review policy');
    expect(lesson.recordedAt).toBeDefined();
  });
});
