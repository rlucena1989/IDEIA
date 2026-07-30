import { LessonLearned } from './knowledge-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('lesson-capture');

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
