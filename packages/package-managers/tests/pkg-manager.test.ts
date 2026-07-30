import { describe, it, expect, beforeEach } from '@jest/globals';
import { PackageManagerService } from '../src/pkg-manager';
import { PackageDep, PackageManager, LockEntry } from '../src/types';

describe('PackageManagerService', () => {
  let service: PackageManagerService;

  beforeEach(() => {
    service = new PackageManagerService();
  });

  describe('constructor', () => {
    it('should create service instance', () => {
      expect(service).toBeInstanceOf(PackageManagerService);
    });
  });

  describe('addDep', () => {
    it('should add a dependency', () => {
      const dep: PackageDep = {
        name: 'lodash',
        version: '^4.17.21',
        manager: 'npm',
        dev: false,
      };
      service.addDep(dep);
      const deps = service.getDeps();
      expect(deps).toHaveLength(1);
      expect(deps[0]).toEqual(dep);
    });
  });

  describe('addDeps', () => {
    it('should add multiple dependencies', () => {
      const deps: PackageDep[] = [
        { name: 'lodash', version: '^4.17.21', manager: 'npm', dev: false },
        { name: 'axios', version: '^1.0.0', manager: 'npm', dev: false },
      ];
      service.addDeps(deps);
      const retrieved = service.getDeps();
      expect(retrieved).toHaveLength(2);
    });
  });

  describe('getDeps', () => {
    it('should return empty array initially', () => {
      const deps = service.getDeps();
      expect(deps).toEqual([]);
    });

    it('should return copy of dependencies', () => {
      const dep: PackageDep = {
        name: 'lodash',
        version: '^4.17.21',
        manager: 'npm',
        dev: false,
      };
      service.addDep(dep);
      const deps1 = service.getDeps();
      const deps2 = service.getDeps();
      expect(deps1).not.toBe(deps2);
    });
  });

  describe('resolve', () => {
    it('should resolve dependencies', () => {
      service.addDeps([
        { name: 'lodash', version: '^4.17.21', manager: 'npm', dev: false },
        { name: 'axios', version: '^1.0.0', manager: 'npm', dev: false },
      ]);
      const result = service.resolve();
      expect(result.resolved).toBeDefined();
      expect(Object.keys(result.resolved)).toHaveLength(2);
      expect(result.conflicts).toEqual([]);
    });

    it('should detect version conflicts', () => {
      service.addDeps([
        { name: 'lodash', version: '^4.17.21', manager: 'npm', dev: false },
        { name: 'lodash', version: '^4.17.20', manager: 'npm', dev: false },
      ]);
      const result = service.resolve();
      expect(result.conflicts).toHaveLength(1);
    });
  });

  describe('audit', () => {
    it('should audit for vulnerabilities', () => {
      service.addDeps([
        { name: 'test-pkg', version: '0.1.0', manager: 'npm', dev: false },
        { name: 'stable-pkg', version: '1.0.0', manager: 'npm', dev: false },
      ]);
      const vulns = service.audit();
      expect(vulns).toHaveLength(1);
      expect(vulns[0].package).toBe('test-pkg');
    });

    it('should not audit non-npm packages', () => {
      service.addDeps([
        { name: 'test-pkg', version: '0.1.0', manager: 'pip', dev: false },
      ]);
      const vulns = service.audit();
      expect(vulns).toHaveLength(0);
    });
  });

  describe('addToLock', () => {
    it('should add lock entry', () => {
      const entry: LockEntry = {
        name: 'lodash',
        version: '^4.17.21',
        resolved: '4.17.21',
        integrity: 'sha512-xxx',
        dependencies: {},
      };
      service.addToLock(entry);
      const retrieved = service.getLock('lodash');
      expect(retrieved).toEqual(entry);
    });
  });

  describe('getLock', () => {
    it('should return undefined for non-existent entry', () => {
      const entry = service.getLock('non-existent');
      expect(entry).toBeUndefined();
    });

    it('should return lock entry', () => {
      const entry: LockEntry = {
        name: 'lodash',
        version: '^4.17.21',
        resolved: '4.17.21',
        integrity: 'sha512-xxx',
        dependencies: {},
      };
      service.addToLock(entry);
      const retrieved = service.getLock('lodash');
      expect(retrieved).toBeDefined();
    });
  });
});
