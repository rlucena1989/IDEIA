jest.mock('fs');

import { DocumentRegistry, createDocumentRegistry } from '../src/document-registry';


describe('DocumentRegistry', () => {
  let registry: DocumentRegistry;

  beforeEach(() => {
    registry = new DocumentRegistry('/tmp/test-docs.json');
  });

  describe('construction', () => {
    it('should start with empty state', () => {
      expect(registry.count()).toBe(0);
      expect(registry.listAll()).toHaveLength(0);
    });

    it('factory createDocumentRegistry returns a DocumentRegistry instance', () => {
      const r = createDocumentRegistry('/tmp/factory.json');
      expect(r).toBeInstanceOf(DocumentRegistry);
    });
  });

  describe('register', () => {
    it('should create a document with auto-generated id and timestamps', () => {
      const doc = registry.register({
        title: 'ADR-001',
        type: 'adr',
        path: 'docs/adr/001-decisions.md',
        status: 'draft',
        version: '1.0.0',
        author: 'dev-team',
        description: 'Architectural decision record',
        tags: ['architecture', 'decision'],
        dependencies: [],
      });
      expect(doc.id).toMatch(/^doc_/);
      expect(doc.title).toBe('ADR-001');
      expect(doc.type).toBe('adr');
      expect(doc.path).toBe('docs/adr/001-decisions.md');
      expect(doc.status).toBe('draft');
      expect(doc.version).toBe('1.0.0');
      expect(doc.author).toBe('dev-team');
      expect(doc.tags).toEqual(['architecture', 'decision']);
      expect(new Date(doc.createdAt).getTime()).toBeGreaterThan(0);
      expect(new Date(doc.updatedAt).getTime()).toBeGreaterThan(0);
    });

    it('should add document to the registry', () => {
      registry.register({
        title: 'Doc',
        type: 'study',
        path: 'docs/study/test.md',
        status: 'approved',
        version: '1.0',
        author: 'me',
        description: 'A study',
        tags: [],
        dependencies: [],
      });
      expect(registry.count()).toBe(1);
    });
  });

  describe('update', () => {
    it('should update fields and refresh updatedAt', () => {
      const doc = registry.register({
        title: 'Original', type: 'guide', path: '/docs/guide.md', status: 'draft',
        version: '1.0', author: 'me', description: 'Guide', tags: [], dependencies: [],
      });
      const updated = registry.update(doc.id, { title: 'Updated Guide', status: 'approved', version: '2.0' });
      expect(updated!.title).toBe('Updated Guide');
      expect(updated!.status).toBe('approved');
      expect(updated!.version).toBe('2.0');
      expect(new Date(updated!.updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(doc.updatedAt).getTime());
    });

    it('should return null for nonexistent document', () => {
      expect(registry.update('nonexistent', { title: 'Nope' })).toBeNull();
    });
  });

  describe('get', () => {
    it('should return document by ID', () => {
      const doc = registry.register({
        title: 'Target', type: 'api', path: '/api/spec.yaml', status: 'approved',
        version: '1.0', author: 'team', description: 'API spec', tags: ['api'], dependencies: [],
      });
      expect(registry.get(doc.id)!.title).toBe('Target');
    });

    it('should return null for nonexistent ID', () => {
      expect(registry.get('no-such-doc')).toBeNull();
    });
  });

  describe('findByPath', () => {
    it('should find document by exact path', () => {
      registry.register({
        title: 'Doc', type: 'report', path: '/docs/report.md', status: 'approved',
        version: '1.0', author: 'a', description: 'Report', tags: [], dependencies: [],
      });
      expect(registry.findByPath('/docs/report.md')).not.toBeNull();
    });

    it('should return null if path does not match', () => {
      registry.register({
        title: 'Doc', type: 'report', path: '/docs/report.md', status: 'approved',
        version: '1.0', author: 'a', description: 'Report', tags: [], dependencies: [],
      });
      expect(registry.findByPath('/docs/other.md')).toBeNull();
    });
  });

  describe('findByType', () => {
    it('should filter documents by type', () => {
      registry.register({
        title: 'ADR', type: 'adr', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'ADR', tags: [], dependencies: [],
      });
      registry.register({
        title: 'Study', type: 'study', path: 'b.md', status: 'draft',
        version: '1.0', author: 'a', description: 'Study', tags: [], dependencies: [],
      });
      expect(registry.findByType('adr')).toHaveLength(1);
      expect(registry.findByType('governance')).toHaveLength(0);
    });
  });

  describe('findByStatus', () => {
    it('should filter documents by status', () => {
      registry.register({
        title: 'Draft', type: 'guide', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'Draft', tags: [], dependencies: [],
      });
      registry.register({
        title: 'Approved', type: 'guide', path: 'b.md', status: 'approved',
        version: '1.0', author: 'a', description: 'Approved', tags: [], dependencies: [],
      });
      expect(registry.findByStatus('draft')).toHaveLength(1);
      expect(registry.findByStatus('review')).toHaveLength(0);
    });
  });

  describe('findByTag', () => {
    it('should find documents containing a specific tag', () => {
      registry.register({
        title: 'A', type: 'adr', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'A', tags: ['security', 'auth'], dependencies: [],
      });
      registry.register({
        title: 'B', type: 'study', path: 'b.md', status: 'draft',
        version: '1.0', author: 'a', description: 'B', tags: ['performance'], dependencies: [],
      });
      expect(registry.findByTag('security')).toHaveLength(1);
      expect(registry.findByTag('performance')).toHaveLength(1);
      expect(registry.findByTag('nonexistent')).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should find by title match (case-insensitive)', () => {
      registry.register({
        title: 'Security Architecture', type: 'adr', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      expect(registry.search('security')).toHaveLength(1);
      expect(registry.search('SECURITY')).toHaveLength(1);
    });

    it('should find by description match', () => {
      registry.register({
        title: 'Doc', type: 'report', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'This is about performance optimization', tags: [], dependencies: [],
      });
      expect(registry.search('performance')).toHaveLength(1);
    });

    it('should find by tag match', () => {
      registry.register({
        title: 'Doc', type: 'guide', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: ['critical-path'], dependencies: [],
      });
      expect(registry.search('critical')).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      registry.register({
        title: 'Doc', type: 'report', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      expect(registry.search('zzzznotfound')).toHaveLength(0);
    });
  });

  describe('listAll', () => {
    it('should return documents sorted by updatedAt descending', () => {
      const d1 = registry.register({
        title: 'Old', type: 'adr', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      const d2 = registry.register({
        title: 'New', type: 'study', path: 'b.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      const list = registry.listAll();
      expect(list).toHaveLength(2);
      const ids = list.map(d => d.id);
      expect(ids).toContain(d1.id);
      expect(ids).toContain(d2.id);
      expect(new Date(list[0].updatedAt).getTime()).toBeGreaterThanOrEqual(new Date(list[1].updatedAt).getTime());
    });
  });

  describe('count', () => {
    it('should return 0 when registry is empty', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return the number of documents', () => {
      registry.register({
        title: 'A', type: 'adr', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      registry.register({
        title: 'B', type: 'study', path: 'b.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      expect(registry.count()).toBe(2);
    });
  });

  describe('getStats', () => {
    it('should return counts per document type', () => {
      registry.register({
        title: 'ADR-1', type: 'adr', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      registry.register({
        title: 'ADR-2', type: 'adr', path: 'b.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      registry.register({
        title: 'Study-1', type: 'study', path: 'c.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      registry.register({
        title: 'Governance', type: 'governance', path: 'd.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      registry.register({
        title: 'API', type: 'api', path: 'e.yaml', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      registry.register({
        title: 'Guide', type: 'guide', path: 'f.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      registry.register({
        title: 'Report', type: 'report', path: 'g.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      const stats = registry.getStats();
      expect(stats.adr).toBe(2);
      expect(stats.study).toBe(1);
      expect(stats.governance).toBe(1);
      expect(stats.api).toBe(1);
      expect(stats.guide).toBe(1);
      expect(stats.report).toBe(1);
    });

    it('should return zero counts for empty registry', () => {
      const stats = registry.getStats();
      expect(stats.adr).toBe(0);
      expect(stats.study).toBe(0);
      expect(stats.governance).toBe(0);
      expect(stats.api).toBe(0);
      expect(stats.guide).toBe(0);
      expect(stats.report).toBe(0);
    });
  });

  describe('persistence', () => {
    it('should call writeFileSync on register', () => {
      const fs = require('fs');
      registry.register({
        title: 'Doc', type: 'report', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should call writeFileSync on update', () => {
      const fs = require('fs');
      const doc = registry.register({
        title: 'Doc', type: 'report', path: 'a.md', status: 'draft',
        version: '1.0', author: 'a', description: 'desc', tags: [], dependencies: [],
      });
      fs.writeFileSync.mockClear();
      registry.update(doc.id, { title: 'Changed' });
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
