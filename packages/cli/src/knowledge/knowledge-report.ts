import { KnowledgeEntry, LessonLearned, DocumentationArtifact } from './knowledge-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('knowledge-report');

export interface KnowledgeReport {
  generatedAt: string;
  entries: KnowledgeEntry[];
  lessons: LessonLearned[];
  artifacts: DocumentationArtifact[];
  notes: string[];
}

export function buildKnowledgeReport(params: {
  entries: KnowledgeEntry[];
  lessons: LessonLearned[];
  artifacts: DocumentationArtifact[];
}): KnowledgeReport {
  const notes: string[] = [
    `${params.entries.length} knowledge entr(ies)`,
    `${params.lessons.length} lesson(s) learned`,
    `${params.artifacts.length} documentation artifact(s)`,
  ];

  return {
    generatedAt: new Date().toISOString(),
    ...params,
    notes,
  };
}
