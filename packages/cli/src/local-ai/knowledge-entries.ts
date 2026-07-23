export interface KnowledgeEntry {
  id: string;
  title: string;
  category: string;
  tags: string[];
  summary: string;
  content: string;
  references?: string[];
  principles?: string[];
  when_to_use?: string[];
  when_not_to_use?: string[];
}

import { ENTRIES as architectureEntries } from './entries/architecture';
import { ENTRIES as backendEntries } from './entries/backend';
import { ENTRIES as frontendEntries } from './entries/frontend';
import { ENTRIES as securityEntries } from './entries/security';
import { ENTRIES as testingEntries } from './entries/testing';
import { ENTRIES as devopsEntries } from './entries/devops';
import { ENTRIES as ai_mlEntries } from './entries/ai-ml';
import { ENTRIES as patternsEntries } from './entries/patterns';

export const CURATED_ENTRIES: KnowledgeEntry[] = [
  ...architectureEntries,
  ...backendEntries,
  ...frontendEntries,
  ...securityEntries,
  ...testingEntries,
  ...devopsEntries,
  ...ai_mlEntries,
  ...patternsEntries,
];
