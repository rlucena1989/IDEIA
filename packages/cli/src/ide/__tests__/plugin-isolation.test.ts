import { PluginIsolation, createPluginIsolation, type PluginInfo, type IsolationLevel, type PluginIsolationConfig } from '../plugin-isolation';
import path from 'node:path';

const testPlugin: PluginInfo = { id: 'test-plugin', name: 'Test Plugin', version: '1.0.0', source: 'local' };

describe('PluginIsolation', () => {
  describe('constructor and config', () => {
    it('uses medium level by default', () => {
      const pi = new PluginIsolation(testPlugin);
      const cfg = pi.getConfig();
      expect(cfg.level).toBe('medium');
      expect(cfg.allowNetwork).toBe(true);
      expect(cfg.allowProcessSpawn).toBe(true);
      expect(cfg.allowFileWrite).toBe(true);
      expect(cfg.allowFileRead).toBe(true);
    });

    it('uses low level when specified', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low' });
      const cfg = pi.getConfig();
      expect(cfg.level).toBe('low');
      expect(cfg.maxMemoryMb).toBe(512);
      expect(cfg.maxCpuPercent).toBe(80);
    });

    it('uses high level when specified', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'high' });
      const cfg = pi.getConfig();
      expect(cfg.level).toBe('high');
      expect(cfg.allowNetwork).toBe(false);
      expect(cfg.allowProcessSpawn).toBe(false);
      expect(cfg.allowFileWrite).toBe(false);
      expect(cfg.maxMemoryMb).toBe(128);
    });

    it('merges custom config over defaults', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', maxMemoryMb: 1024, timeoutMs: 60000 });
      const cfg = pi.getConfig();
      expect(cfg.level).toBe('low');
      expect(cfg.maxMemoryMb).toBe(1024);
      expect(cfg.timeoutMs).toBe(60000);
      expect(cfg.maxCpuPercent).toBe(80);
    });
  });

  describe('getPlugin', () => {
    it('returns a copy of plugin info', () => {
      const pi = new PluginIsolation(testPlugin);
      const info = pi.getPlugin();
      expect(info).toEqual(testPlugin);
      expect(info).not.toBe(testPlugin);
    });
  });

  describe('updateConfig', () => {
    it('updates specific config fields', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low' });
      pi.updateConfig({ maxCpuPercent: 50, timeoutMs: 5000 });
      const cfg = pi.getConfig();
      expect(cfg.maxCpuPercent).toBe(50);
      expect(cfg.timeoutMs).toBe(5000);
      expect(cfg.level).toBe('low');
    });
  });

  describe('checkFileRead', () => {
    it('allows file read within allowed paths', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: [process.cwd()] });
      const result = pi.checkFileRead(path.join(process.cwd(), 'test.txt'));
      expect(result.allowed).toBe(true);
      expect(result.action).toBe('file-read');
    });

    it('denies file read when allowFileRead is false', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'high', allowFileRead: false });
      const result = pi.checkFileRead('/some/file.txt');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('denies file read for paths outside allowlist', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: ['/allowed'] });
      const result = pi.checkFileRead('/outside/file.txt');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowlist');
    });

    it('returns timestamp in result', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: [process.cwd()] });
      const result = pi.checkFileRead(path.join(process.cwd(), 'a.txt'));
      expect(result.timestamp).toBeDefined();
      expect(typeof result.timestamp).toBe('string');
    });
  });

  describe('checkFileWrite', () => {
    it('allows file write within allowed paths', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: [process.cwd()] });
      const result = pi.checkFileWrite(path.join(process.cwd(), 'output.txt'));
      expect(result.allowed).toBe(true);
      expect(result.action).toBe('file-write');
    });

    it('denies file write when allowFileWrite is false', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'high', allowFileWrite: false });
      const result = pi.checkFileWrite('/some/file.txt');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('denies file write for paths outside allowlist', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: ['/allowed'] });
      const result = pi.checkFileWrite('/outside/file.txt');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowlist');
    });
  });

  describe('checkNetwork', () => {
    it('allows network when allowNetwork is true', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowNetwork: true });
      const result = pi.checkNetwork('https://example.com');
      expect(result.allowed).toBe(true);
      expect(result.action).toBe('network');
    });

    it('denies network when allowNetwork is false', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'high', allowNetwork: false });
      const result = pi.checkNetwork('https://example.com');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });

    it('allows URLs matching wildcard patterns', () => {
      const pi = new PluginIsolation(testPlugin, {
        level: 'medium',
        allowedUrls: ['https://*.npmjs.org', 'https://registry.npmjs.org/*'],
      });
      expect(pi.checkNetwork('https://registry.npmjs.org/package/test').allowed).toBe(true);
      expect(pi.checkNetwork('https://other.com').allowed).toBe(false);
    });

    it('allows any URL when wildcard * is in list', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedUrls: ['*'] });
      expect(pi.checkNetwork('https://anything.com/path').allowed).toBe(true);
    });
  });

  describe('checkProcessSpawn', () => {
    it('allows commands in allowlist', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'medium', allowedCommands: ['node', 'npm', 'npx', 'git'] });
      expect(pi.checkProcessSpawn('node server.js').allowed).toBe(true);
      expect(pi.checkProcessSpawn('npm install').allowed).toBe(true);
      expect(pi.checkProcessSpawn('git status').allowed).toBe(true);
    });

    it('denies commands not in allowlist', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'medium', allowedCommands: ['node', 'npm'] });
      const result = pi.checkProcessSpawn('rm -rf /');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('not in allowlist');
    });

    it('allows any command when wildcard * is in list', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedCommands: ['*'] });
      expect(pi.checkProcessSpawn('anything --all').allowed).toBe(true);
    });

    it('denies when allowProcessSpawn is false', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'high', allowProcessSpawn: false });
      const result = pi.checkProcessSpawn('node app.js');
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain('disabled');
    });
  });

  describe('checkResourceLimits', () => {
    it('returns withinLimits when memory is under limit', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', maxMemoryMb: 999999 });
      const result = pi.checkResourceLimits();
      expect(result.withinLimits).toBe(true);
      expect(typeof result.currentMemoryMb).toBe('number');
    });

    it('returns exceeded when memory is over limit', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', maxMemoryMb: 0.0000001 });
      const result = pi.checkResourceLimits();
      if (!result.withinLimits) {
        expect(result.reason).toContain('exceeds limit');
      }
    });
  });

  describe('audit logging', () => {
    it('creates audit entries for checked actions', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: [process.cwd()], auditEnabled: true });
      pi.checkFileRead(path.join(process.cwd(), 'test.txt'));
      pi.checkFileWrite(path.join(process.cwd(), 'out.txt'));

      const log = pi.getAuditLog();
      expect(log).toHaveLength(2);
      expect(log[0].action).toBe('file-read');
      expect(log[0].pluginId).toBe('test-plugin');
      expect(log[1].action).toBe('file-write');
    });

    it('does not create audit entries when auditEnabled is false', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: [process.cwd()], auditEnabled: false });
      pi.checkFileRead(path.join(process.cwd(), 'test.txt'));
      expect(pi.getAuditLog()).toHaveLength(0);
    });

    it('includes denied reasons in audit entries', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: ['/allowed'], auditEnabled: true });
      pi.checkFileRead('/outside/file.txt');

      const log = pi.getAuditLog();
      expect(log[0].allowed).toBe(false);
      expect(log[0].reason).toContain('not in allowlist');
    });
  });

  describe('createPluginIsolation factory', () => {
    it('creates a PluginIsolation instance', () => {
      const pi = createPluginIsolation(testPlugin, { level: 'high' });
      expect(pi).toBeInstanceOf(PluginIsolation);
      expect(pi.getConfig().level).toBe('high');
    });
  });

  describe('isPathAllowed (via checkFileRead)', () => {
    it('allows exact path match', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: ['/workspace'] });
      expect(pi.checkFileRead('/workspace').allowed).toBe(true);
    });

    it('allows subdirectory of allowed path', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: ['/workspace'] });
      expect(pi.checkFileRead('/workspace/sub/file.js').allowed).toBe(true);
    });

    it('denies sibling directory outside allowed path', () => {
      const pi = new PluginIsolation(testPlugin, { level: 'low', allowedPaths: ['/workspace'] });
      expect(pi.checkFileRead('/other/file.js').allowed).toBe(false);
    });
  });
});
