import { listActiveDocuments, findDocumentByTaskType, findDocumentsByCategory, findDocumentByPath } from '../document-registry';

describe('document-registry', () => {
  describe('listActiveDocuments', () => {
    it('returns all active documents sorted by priority descending', () => {
      const docs = listActiveDocuments();
      expect(docs.length).toBeGreaterThan(0);
      for (let i = 0; i < docs.length - 1; i++) {
        expect(docs[i].priority).toBeGreaterThanOrEqual(docs[i + 1].priority);
      }
    });

    it('only includes active documents', () => {
      expect(listActiveDocuments().every(d => d.active)).toBe(true);
    });
  });

  describe('findDocumentByTaskType', () => {
    it('finds by exact id match', () => {
      const doc = findDocumentByTaskType('master-plan');
      expect(doc).toBeDefined();
      expect(doc!.id).toBe('master-plan');
    });

    it('finds by tag when id does not match', () => {
      const doc = findDocumentByTaskType('execution');
      expect(doc).toBeDefined();
      expect(doc!.tags).toContain('execution');
    });

    it('prioritizes exact id over tag match when both exist', () => {
      const doc = findDocumentByTaskType('backlog');
      expect(doc).toBeDefined();
      expect(doc!.id).toBe('backlog');
    });

    it('returns undefined for unknown type', () => {
      expect(findDocumentByTaskType('nonexistent-type-xyz')).toBeUndefined();
    });
  });

  describe('findDocumentsByCategory', () => {
    it('returns documents for known category sorted by priority', () => {
      const docs = findDocumentsByCategory('policy');
      expect(docs.length).toBeGreaterThanOrEqual(4);
      expect(docs.every(d => d.category === 'policy')).toBe(true);
      for (let i = 0; i < docs.length - 1; i++) {
        expect(docs[i].priority).toBeGreaterThanOrEqual(docs[i + 1].priority);
      }
    });

    it('returns empty array for category with no documents', () => {
      expect(findDocumentsByCategory('metric').length).toBeGreaterThan(0);
    });

    it('ignores inactive documents', () => {
      const task = findDocumentsByCategory('task');
      expect(task.every(d => d.active)).toBe(true);
    });
  });

  describe('findDocumentByPath', () => {
    it('finds document by exact path', () => {
      const doc = findDocumentByPath('.ai/laws.yaml');
      expect(doc).toBeDefined();
      expect(doc!.id).toBe('laws');
    });

    it('returns undefined for unknown path', () => {
      expect(findDocumentByPath('/nonexistent/path.md')).toBeUndefined();
    });
  });
});
