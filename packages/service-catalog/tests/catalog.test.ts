import { describe, it, expect, beforeEach } from '@jest/globals';
import { ServiceCatalog } from '../src/catalog';
import { ServiceDefinition } from '../src/types';

describe('ServiceCatalog', () => {
  let catalog: ServiceCatalog;
  let mockServices: ServiceDefinition[];

  beforeEach(() => {
    catalog = new ServiceCatalog();
    mockServices = [
      {
        id: 'service-1',
        name: 'API Service',
        description: 'REST API service',
        owner: 'team-a',
        language: 'typescript',
        tags: ['api', 'rest'],
        repository: 'https://github.com/org/api-service',
        status: 'active',
        score: 85,
        grade: 'B',
      },
      {
        id: 'service-2',
        name: 'Web App',
        description: 'Web application',
        owner: 'team-b',
        language: 'javascript',
        tags: ['web', 'frontend'],
        repository: 'https://github.com/org/web-app',
        status: 'active',
        score: 92,
        grade: 'A',
      },
      {
        id: 'service-3',
        name: 'Legacy Service',
        description: 'Legacy monolith',
        owner: 'team-a',
        language: 'java',
        tags: ['legacy', 'monolith'],
        repository: 'https://github.com/org/legacy',
        status: 'deprecated',
        score: 65,
        grade: 'D',
      },
    ];
  });

  describe('constructor', () => {
    it('should create catalog instance', () => {
      expect(catalog).toBeInstanceOf(ServiceCatalog);
    });
  });

  describe('register', () => {
    it('should register service', () => {
      catalog.register(mockServices[0]);
      const retrieved = catalog.get('service-1');
      expect(retrieved).toEqual(mockServices[0]);
    });
  });

  describe('get', () => {
    it('should return undefined for non-existent service', () => {
      const service = catalog.get('non-existent');
      expect(service).toBeUndefined();
    });

    it('should return registered service', () => {
      catalog.register(mockServices[0]);
      const service = catalog.get('service-1');
      expect(service).toEqual(mockServices[0]);
    });
  });

  describe('list', () => {
    it('should return empty list initially', () => {
      const services = catalog.list();
      expect(services).toEqual([]);
    });

    it('should return all registered services', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      const services = catalog.list();
      expect(services).toHaveLength(2);
    });
  });

  describe('search', () => {
    it('should search by name', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      const results = catalog.search('API');
      expect(results).toHaveLength(1);
      expect(results[0].id).toBe('service-1');
    });

    it('should search by description', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      const results = catalog.search('REST');
      expect(results).toHaveLength(1);
    });

    it('should search by tags', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      const results = catalog.search('api');
      expect(results).toHaveLength(1);
    });

    it('should return empty array for no matches', () => {
      catalog.register(mockServices[0]);
      const results = catalog.search('nonexistent');
      expect(results).toEqual([]);
    });
  });

  describe('filter', () => {
    it('should filter by criteria', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      catalog.register(mockServices[2]);
      const results = catalog.filter({ status: 'active' });
      expect(results).toHaveLength(2);
    });

    it('should filter by owner', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      catalog.register(mockServices[2]);
      const results = catalog.filter({ owner: 'team-a' });
      expect(results).toHaveLength(2);
    });
  });

  describe('count', () => {
    it('should return 0 initially', () => {
      expect(catalog.count()).toBe(0);
    });

    it('should return service count', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      expect(catalog.count()).toBe(2);
    });
  });

  describe('getByOwner', () => {
    it('should return services by owner', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      catalog.register(mockServices[2]);
      const services = catalog.getByOwner('team-a');
      expect(services).toHaveLength(2);
    });

    it('should return empty array for no matches', () => {
      catalog.register(mockServices[0]);
      const services = catalog.getByOwner('non-existent');
      expect(services).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should return empty stats initially', () => {
      const stats = catalog.getStats();
      expect(stats.total).toBe(0);
      expect(stats.active).toBe(0);
      expect(stats.deprecated).toBe(0);
      expect(stats.planned).toBe(0);
      expect(stats.languages).toBe(0);
    });

    it('should return stats with services', () => {
      catalog.register(mockServices[0]);
      catalog.register(mockServices[1]);
      catalog.register(mockServices[2]);
      const stats = catalog.getStats();
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.deprecated).toBe(1);
      expect(stats.planned).toBe(0);
      expect(stats.languages).toBe(3);
    });
  });
});
