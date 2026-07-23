import { describe, it, expect } from '@jest/globals';
import { KnowledgeBase } from '../knowledge-base';
import { createKnowledgeEntry } from '../knowledge-types';

describe('knowledge-base', () => {
  it('should upsert and list entries', () => {
    const kb = new KnowledgeBase();
    kb.upsert(createKnowledgeEntry({ category: 'guide', title: 'Setup Guide', content: 'Step 1...' }));
    expect(kb.count()).toBe(1);
  });

  it('should update existing entry on upsert', () => {
    const kb = new KnowledgeBase();
    const entry = createKnowledgeEntry({ category: 'guide', title: 'Guide', content: 'v1' });
    kb.upsert(entry);
    kb.upsert({ ...entry, content: 'v2' });
    expect(kb.count()).toBe(1);
    expect(kb.list()[0].content).toBe('v2');
  });

  it('should filter by category', () => {
    const kb = new KnowledgeBase();
    kb.upsert(createKnowledgeEntry({ category: 'incident', title: 'I1', content: '' }));
    kb.upsert(createKnowledgeEntry({ category: 'guide', title: 'G1', content: '' }));
    expect(kb.findByCategory('incident').length).toBe(1);
  });

  it('should search by title and content', () => {
    const kb = new KnowledgeBase();
    kb.upsert(createKnowledgeEntry({ category: 'faq', title: 'How to restart', content: 'Use command X', tags: ['restart'] }));
    expect(kb.search('restart').length).toBe(1);
    expect(kb.search('command').length).toBe(1);
    expect(kb.search('nonexistent').length).toBe(0);
  });

  it('should remove entry', () => {
    const kb = new KnowledgeBase();
    const entry = createKnowledgeEntry({ category: 'guide', title: 'G1', content: '' });
    kb.upsert(entry);
    expect(kb.remove(entry.knowledgeId)).toBe(true);
    expect(kb.count()).toBe(0);
  });
});
