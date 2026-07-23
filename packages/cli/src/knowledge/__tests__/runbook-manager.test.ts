import { describe, it, expect } from '@jest/globals';
import { buildRunbook, buildRunbookSections } from '../runbook-manager';
import { createKnowledgeEntry } from '../knowledge-types';

describe('runbook-manager', () => {
  it('buildRunbook should produce runbook from active entries', () => {
    const entries = [
      createKnowledgeEntry({ category: 'runbook', title: 'Recovery', content: 'Step 1: Check logs', status: 'active' }),
      createKnowledgeEntry({ category: 'faq', title: 'How to restart', content: 'Use restart command', status: 'active' }),
    ];
    const runbook = buildRunbook(entries);
    expect(runbook).toContain('[runbook]');
    expect(runbook).toContain('[faq]');
    expect(runbook).toContain('Check logs');
  });

  it('buildRunbook should skip non-active entries', () => {
    const entries = [
      createKnowledgeEntry({ category: 'runbook', title: 'Old', content: 'Obsolete', status: 'obsolete' }),
    ];
    const runbook = buildRunbook(entries);
    expect(runbook).toBe('');
  });

  it('buildRunbookSections should group by category', () => {
    const entries = [
      createKnowledgeEntry({ category: 'runbook', title: 'R1', content: 'Content 1', status: 'active' }),
      createKnowledgeEntry({ category: 'guide', title: 'G1', content: 'Content 2', status: 'active' }),
    ];
    const sections = buildRunbookSections(entries);
    expect(sections['runbook']).toBeDefined();
    expect(sections['guide']).toBeDefined();
    expect(sections['runbook'].length).toBe(1);
  });
});
