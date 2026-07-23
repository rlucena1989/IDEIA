import { describe, it, expect } from '@jest/globals';
import { generateMarkdownDocs, buildDocumentationArtifact } from '../doc-generator';
import { createKnowledgeEntry } from '../knowledge-types';

describe('doc-generator', () => {
  it('generateMarkdownDocs should produce markdown', () => {
    const entries = [
      createKnowledgeEntry({ category: 'guide', title: 'Guide 1', content: 'Content 1' }),
      createKnowledgeEntry({ category: 'faq', title: 'FAQ 1', content: 'Answer 1' }),
    ];
    const md = generateMarkdownDocs(entries);
    expect(md).toContain('# Documentation Snapshot');
    expect(md).toContain('## Guide 1');
    expect(md).toContain('Content 1');
    expect(md).toContain('## FAQ 1');
  });

  it('buildDocumentationArtifact should create artifact', () => {
    const artifact = buildDocumentationArtifact([], 'test-doc', '2.0');
    expect(artifact.name).toBe('test-doc');
    expect(artifact.version).toBe('2.0');
    expect(artifact.type).toBe('markdown');
    expect(artifact.docId).toContain('doc-');
  });
});
