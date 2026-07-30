import * as crypto from 'node:crypto';
import { createLogger } from '@ideia/logger';
const logger = createLogger('knowledge-types');

export interface KnowledgeEntry {
  knowledgeId: string;
  category: 'incident' | 'decision' | 'policy' | 'lesson' | 'runbook' | 'guide' | 'faq' | 'version-note';
  title: string;
  content: string;
  tags: string[];
  createdAt: string;
  updatedAt?: string;
  status: 'active' | 'draft' | 'obsolete';
}

export interface LessonLearned {
  lessonId: string;
  summary: string;
  context: string;
  outcome: string;
  recommendation: string;
  recordedAt: string;
}

export interface DocumentationArtifact {
  docId: string;
  name: string;
  type: 'markdown' | 'json' | 'yaml' | 'html';
  content: string;
  version: string;
}

export function createKnowledgeEntry(params: {
  category: KnowledgeEntry['category'];
  title: string;
  content: string;
  tags?: string[];
  status?: KnowledgeEntry['status'];
}): KnowledgeEntry {
  return {
    knowledgeId: crypto.randomUUID(),
    category: params.category,
    title: params.title,
    content: params.content,
    tags: params.tags ?? [],
    createdAt: new Date().toISOString(),
    status: params.status ?? 'active',
  };
}
