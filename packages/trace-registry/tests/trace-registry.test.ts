import { describe, it, expect, beforeEach } from '@jest/globals';
import { TraceRegistry, createTraceRegistry } from '../src/trace-registry';
import { EntityType, Relationship, LinkRequest } from '../src/types';

describe('TraceRegistry', () => {
  let registry: TraceRegistry;

  beforeEach(() => {
    registry = createTraceRegistry();
  });

  describe('constructor', () => {
    it('should create registry instance', () => {
      expect(registry).toBeInstanceOf(TraceRegistry);
    });
  });

  describe('link', () => {
    it('should create trace link', () => {
      const request: LinkRequest = {
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      };
      const link = registry.link(request);
      expect(link).toBeDefined();
      expect(link.id).toBeDefined();
      expect(link.sourceType).toBe('requirement');
      expect(link.targetType).toBe('code_file');
      expect(link.relationship).toBe('implements');
      expect(link.confidence).toBe(1);
    });

    it('should set custom confidence', () => {
      const request: LinkRequest = {
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
        confidence: 0.8,
      };
      const link = registry.link(request);
      expect(link.confidence).toBe(0.8);
    });
  });

  describe('unlink', () => {
    it('should remove link', () => {
      const request: LinkRequest = {
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      };
      const link = registry.link(request);
      const removed = registry.unlink(link.id);
      expect(removed).toBe(true);
    });

    it('should return false for non-existent link', () => {
      const removed = registry.unlink('non-existent');
      expect(removed).toBe(false);
    });
  });

  describe('getBySource', () => {
    it('should return links by source', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      const links = registry.getBySource('requirement', 'req-1');
      expect(links).toHaveLength(1);
    });

    it('should return empty array for non-existent source', () => {
      const links = registry.getBySource('requirement', 'non-existent');
      expect(links).toEqual([]);
    });
  });

  describe('getByTarget', () => {
    it('should return links by target', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      const links = registry.getByTarget('code_file', 'file-1');
      expect(links).toHaveLength(1);
    });

    it('should return empty array for non-existent target', () => {
      const links = registry.getByTarget('code_file', 'non-existent');
      expect(links).toEqual([]);
    });
  });

  describe('getByEntity', () => {
    it('should return both outgoing and incoming links', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      registry.link({
        sourceType: 'test_file',
        sourceId: 'test-1',
        targetType: 'requirement',
        targetId: 'req-1',
        relationship: 'tests',
      });
      const links = registry.getByEntity('requirement', 'req-1');
      expect(links.outgoing).toHaveLength(1);
      expect(links.incoming).toHaveLength(1);
    });
  });

  describe('getAll', () => {
    it('should return all links', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-2',
        targetType: 'code_file',
        targetId: 'file-2',
        relationship: 'implements',
      });
      const links = registry.getAll();
      expect(links).toHaveLength(2);
    });

    it('should return empty array initially', () => {
      const links = registry.getAll();
      expect(links).toEqual([]);
    });
  });

  describe('getGraph', () => {
    it('should return trace graph', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      const graph = registry.getGraph();
      expect(graph).toBeDefined();
      expect(graph.nodes).toHaveLength(2);
      expect(graph.edges).toHaveLength(1);
    });
  });

  describe('findPath', () => {
    it('should find path between entities', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      registry.link({
        sourceType: 'code_file',
        sourceId: 'file-1',
        targetType: 'test_file',
        targetId: 'test-1',
        relationship: 'tests',
      });
      const path = registry.findPath('requirement', 'req-1', 'test_file', 'test-1');
      expect(path).toBeDefined();
      expect(path?.path).toHaveLength(2);
    });

    it('should return null when no path exists', () => {
      const path = registry.findPath('requirement', 'req-1', 'test_file', 'test-1');
      expect(path).toBeNull();
    });
  });

  describe('count', () => {
    it('should return 0 initially', () => {
      expect(registry.count()).toBe(0);
    });

    it('should return link count', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      expect(registry.count()).toBe(1);
    });
  });

  describe('clear', () => {
    it('should clear all links', () => {
      registry.link({
        sourceType: 'requirement',
        sourceId: 'req-1',
        targetType: 'code_file',
        targetId: 'file-1',
        relationship: 'implements',
      });
      registry.clear();
      expect(registry.count()).toBe(0);
    });
  });

  describe('createTraceRegistry', () => {
    it('should create registry instance', () => {
      const registry = createTraceRegistry();
      expect(registry).toBeInstanceOf(TraceRegistry);
    });
  });
});
