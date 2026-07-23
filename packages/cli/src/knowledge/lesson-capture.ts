import { LessonLearned } from './knowledge-types';

export function captureLesson(input: {
  summary: string;
  context: string;
  outcome: string;
  recommendation: string;
}): LessonLearned {
  return {
    lessonId: `lesson-${Date.now()}`,
    summary: input.summary,
    context: input.context,
    outcome: input.outcome,
    recommendation: input.recommendation,
    recordedAt: new Date().toISOString(),
  };
}
