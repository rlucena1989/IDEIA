import { KnowledgeEntry, DocumentationArtifact } from './knowledge-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('doc-generator');

export function generateMarkdownDocs(entries: KnowledgeEntry[]): string {
  const sections = entries.map(entry => `## ${entry.title}\n\n${entry.content}\n`);
  return `# Documentation Snapshot\n\n${sections.join('\n')}`;
}

export function buildDocumentationArtifact(entries: KnowledgeEntry[], name: string, version: string): DocumentationArtifact {
  return {
    docId: `doc-${Date.now()}`,
    name,
    type: 'markdown',
    content: generateMarkdownDocs(entries),
    version,
  };
}
