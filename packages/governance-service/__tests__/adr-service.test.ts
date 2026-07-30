jest.mock('fs');

import { AdrService, createAdrService } from '../src/adr-service';

describe('AdrService', () => {
  let service: AdrService;

  beforeEach(() => {
    service = new AdrService('/tmp/test-adrs.json');
  });

  describe('construction', () => {
    it('should start with empty state', () => {
      expect(service.listAdrs()).toHaveLength(0);
      const stats = service.getStats();
      expect(stats.total).toBe(0);
    });

    it('factory createAdrService returns an AdrService instance', () => {
      const s = createAdrService('/tmp/factory.json');
      expect(s).toBeInstanceOf(AdrService);
    });
  });

  describe('createAdr', () => {
    it('should create an ADR with proposed status and all fields', () => {
      const adr = service.createAdr(
        'Use NATS JetStream',
        'Need a distributed event bus',
        'Adopt NATS JetStream for all async messaging',
        'Adds 50ms latency but provides persistence',
        'high',
        'architect',
        ['messaging', 'infrastructure']
      );
      expect(adr.id).toMatch(/^adr_/);
      expect(adr.title).toBe('Use NATS JetStream');
      expect(adr.context).toBe('Need a distributed event bus');
      expect(adr.decision).toBe('Adopt NATS JetStream for all async messaging');
      expect(adr.consequences).toBe('Adds 50ms latency but provides persistence');
      expect(adr.impact).toBe('high');
      expect(adr.author).toBe('architect');
      expect(adr.status).toBe('proposed');
      expect(adr.tags).toEqual(['messaging', 'infrastructure']);
      expect(adr.alternatives).toEqual([]);
      expect(adr.date).toBeDefined();
    });

    it('should add ADR to the list', () => {
      service.createAdr('Title', 'ctx', 'dec', 'cons', 'medium', 'dev', []);
      expect(service.listAdrs()).toHaveLength(1);
    });
  });

  describe('acceptAdr', () => {
    it('should transition status from proposed to accepted', () => {
      const adr = service.createAdr('Title', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const accepted = service.acceptAdr(adr.id);
      expect(accepted!.status).toBe('accepted');
      expect(accepted!.id).toBe(adr.id);
    });

    it('should return null for nonexistent ADR', () => {
      expect(service.acceptAdr('nonexistent')).toBeNull();
    });

    it('should persist the change', () => {
      const fs = require('fs');
      const adr = service.createAdr('Title', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      fs.writeFileSync.mockClear();
      service.acceptAdr(adr.id);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });

  describe('deprecateAdr', () => {
    it('should set status to deprecated when no supersededBy', () => {
      const adr = service.createAdr('Old approach', 'ctx', 'dec', 'cons', 'medium', 'dev', []);
      const deprecated = service.deprecateAdr(adr.id);
      expect(deprecated!.status).toBe('deprecated');
      expect(deprecated!.supersededBy).toBeUndefined();
    });

    it('should set status to superseded when supersededBy is provided', () => {
      const oldAdr = service.createAdr('Old', 'ctx', 'dec', 'cons', 'medium', 'dev', []);
      const newAdr = service.createAdr('New', 'ctx', 'dec', 'cons', 'high', 'dev', []);
      const superseded = service.deprecateAdr(oldAdr.id, newAdr.id);
      expect(superseded!.status).toBe('superseded');
      expect(superseded!.supersededBy).toBe(newAdr.id);
    });

    it('should return null for nonexistent ADR', () => {
      expect(service.deprecateAdr('nonexistent')).toBeNull();
    });
  });

  describe('addAlternative', () => {
    it('should append an alternative to the ADR', () => {
      const adr = service.createAdr('Title', 'ctx', 'dec', 'cons', 'medium', 'dev', []);
      const updated = service.addAlternative(adr.id, 'Use Kafka instead');
      expect(updated!.alternatives).toHaveLength(1);
      expect(updated!.alternatives[0]).toBe('Use Kafka instead');
    });

    it('should accumulate multiple alternatives', () => {
      const adr = service.createAdr('Title', 'ctx', 'dec', 'cons', 'medium', 'dev', []);
      service.addAlternative(adr.id, 'Option A');
      service.addAlternative(adr.id, 'Option B');
      service.addAlternative(adr.id, 'Option C');
      const updated = service.getAdr(adr.id);
      expect(updated!.alternatives).toHaveLength(3);
      expect(updated!.alternatives).toEqual(['Option A', 'Option B', 'Option C']);
    });

    it('should return null for nonexistent ADR', () => {
      expect(service.addAlternative('nonexistent', 'Option')).toBeNull();
    });
  });

  describe('getAdr', () => {
    it('should return an ADR by ID', () => {
      const adr = service.createAdr('Target', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      expect(service.getAdr(adr.id)!.title).toBe('Target');
    });

    it('should return null for nonexistent ID', () => {
      expect(service.getAdr('no-such-adr')).toBeNull();
    });
  });

  describe('listAdrs', () => {
    it('should return all ADRs sorted by date descending', () => {
      const a1 = service.createAdr('A', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const a2 = service.createAdr('B', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const a3 = service.createAdr('C', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const list = service.listAdrs();
      expect(list).toHaveLength(3);
      const ids = list.map(a => a.id);
      expect(ids).toContain(a1.id);
      expect(ids).toContain(a2.id);
      expect(ids).toContain(a3.id);
      for (let i = 1; i < list.length; i++) {
        const prev = new Date(list[i - 1].date).getTime();
        const curr = new Date(list[i].date).getTime();
        expect(prev).toBeGreaterThanOrEqual(curr);
      }
    });

    it('should filter by status', () => {
      const proposed = service.createAdr('Proposed', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const accepted = service.createAdr('Accepted', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      service.acceptAdr(accepted.id);
      const result = service.listAdrs('proposed');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(proposed.id);
    });
  });

  describe('findByTag', () => {
    it('should find ADRs containing a specific tag', () => {
      service.createAdr('A', 'ctx', 'dec', 'cons', 'low', 'dev', ['security']);
      service.createAdr('B', 'ctx', 'dec', 'cons', 'low', 'dev', ['performance']);
      service.createAdr('C', 'ctx', 'dec', 'cons', 'low', 'dev', ['security', 'auth']);

      expect(service.findByTag('security')).toHaveLength(2);
      expect(service.findByTag('performance')).toHaveLength(1);
      expect(service.findByTag('nonexistent')).toHaveLength(0);
    });
  });

  describe('search', () => {
    it('should find by title (case-insensitive)', () => {
      service.createAdr('NATS Migration', 'ctx', 'dec', 'cons', 'medium', 'dev', []);
      expect(service.search('nats')).toHaveLength(1);
      expect(service.search('NATS')).toHaveLength(1);
    });

    it('should find by context', () => {
      service.createAdr('Title', 'Need to handle 10k TPS', 'dec', 'cons', 'high', 'arch', []);
      expect(service.search('10k')).toHaveLength(1);
    });

    it('should find by decision', () => {
      service.createAdr('Title', 'ctx', 'Adopt Kafka for streaming', 'cons', 'medium', 'dev', []);
      expect(service.search('Kafka')).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      service.createAdr('Title', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      expect(service.search('zzzznotfound')).toHaveLength(0);
    });
  });

  describe('getStats', () => {
    it('should return correct counts across all statuses', () => {
      const _a1 = service.createAdr('A', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const a2 = service.createAdr('B', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const a3 = service.createAdr('C', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      service.acceptAdr(a2.id);
      service.deprecateAdr(a3.id);

      const stats = service.getStats();
      expect(stats.total).toBe(3);
      expect(stats.proposed).toBe(1);
      expect(stats.accepted).toBe(1);
      expect(stats.deprecated).toBe(1);
      expect(stats.superseded).toBe(0);
    });
  });

  describe('status transitions', () => {
    it('should follow: proposed -> accepted -> deprecated', () => {
      const adr = service.createAdr('ADR', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      expect(adr.status).toBe('proposed');
      const accepted = service.acceptAdr(adr.id);
      expect(accepted!.status).toBe('accepted');
      const deprecated = service.deprecateAdr(adr.id);
      expect(deprecated!.status).toBe('deprecated');
    });

    it('should follow: proposed -> superseded', () => {
      const old = service.createAdr('Old', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      const newAdr = service.createAdr('New', 'ctx', 'dec', 'cons', 'high', 'dev', []);
      const superseded = service.deprecateAdr(old.id, newAdr.id);
      expect(superseded!.status).toBe('superseded');
      expect(superseded!.supersededBy).toBe(newAdr.id);
    });
  });

  describe('persistence', () => {
    it('should call writeFileSync on createAdr', () => {
      const fs = require('fs');
      service.createAdr('Title', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should call writeFileSync on acceptAdr', () => {
      const fs = require('fs');
      const adr = service.createAdr('Title', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      fs.writeFileSync.mockClear();
      service.acceptAdr(adr.id);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should call writeFileSync on deprecateAdr', () => {
      const fs = require('fs');
      const adr = service.createAdr('Title', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      fs.writeFileSync.mockClear();
      service.deprecateAdr(adr.id);
      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should call writeFileSync on addAlternative', () => {
      const fs = require('fs');
      const adr = service.createAdr('Title', 'ctx', 'dec', 'cons', 'low', 'dev', []);
      fs.writeFileSync.mockClear();
      service.addAlternative(adr.id, 'Option X');
      expect(fs.writeFileSync).toHaveBeenCalled();
    });
  });
});
