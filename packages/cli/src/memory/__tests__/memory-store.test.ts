import { describe, it, expect } from '@jest/globals';
import { MemoryStore, createMemoryRecord } from '@ideia/memory-store';

describe('memory-store', () => {
  it('should append and list records', () => {
    const s = new MemoryStore();
    s.append(createMemoryRecord({ category: 'cycle', source: 'test', summary: 'Cycle 1', tags: ['cycle'] }));
    expect(s.count()).toBe(1);
  });

  it('should filter by category', () => {
    const s = new MemoryStore();
    s.append(createMemoryRecord({ category: 'failure', source: 't', summary: 'F1', tags: ['f'] }));
    s.append(createMemoryRecord({ category: 'cycle', source: 't', summary: 'C1', tags: ['c'] }));
    expect(s.findByCategory('failure').length).toBe(1);
  });

  it('should search by summary text', () => {
    const s = new MemoryStore();
    s.append(createMemoryRecord({ category: 'failure', source: 't', summary: 'consistency error', tags: ['error'] }));
    expect(s.search('consistency').length).toBe(1);
  });
});
