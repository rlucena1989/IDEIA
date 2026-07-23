import { loadManifest, validateSdkManifest, loadPlugin, PluginManifest } from '../runtime/plugin-sdk';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('plugin-sdk', () => {
  let tmpDir: string;
  let originalCwd: () => string;

  beforeAll(() => {
    originalCwd = process.cwd;
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'plugin-sdk-test-'));
    process.cwd = () => tmpDir;
    fs.mkdirSync(path.join(tmpDir, '.ai', 'plugins', 'valid-plugin'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.ai', 'plugins', 'valid-plugin', 'plugin.json'), JSON.stringify({
      id: 'valid-plugin', name: 'Valid Plugin', version: '1.0.0',
      minDevkitVersion: '2.0.0', description: 'A valid plugin',
      author: 'Test', permissions: ['read_file'], hooks: [], commands: [],
    }));
    fs.writeFileSync(path.join(tmpDir, '.ai', 'plugins', 'valid-plugin', 'index.js'), 'module.exports = {};');
  });

  afterAll(() => {
    process.cwd = originalCwd;
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadManifest', () => {
    it('deve carregar plugin.json valido', () => {
      const dir = path.join(tmpDir, '.ai', 'plugins', 'valid-plugin');
      const manifest = loadManifest(dir);
      expect(manifest).not.toBeNull();
      expect(manifest!.id).toBe('valid-plugin');
    });

    it('deve retornar null para diretorio sem manifest', () => {
      const emptyDir = path.join(tmpDir, 'no-manifest');
      fs.mkdirSync(emptyDir, { recursive: true });
      expect(loadManifest(emptyDir)).toBeNull();
    });

    it('deve retornar null para JSON invalido', () => {
      const badDir = path.join(tmpDir, 'bad-json-plugin');
      fs.mkdirSync(badDir, { recursive: true });
      fs.writeFileSync(path.join(badDir, 'plugin.json'), 'not-json');
      expect(loadManifest(badDir)).toBeNull();
    });
  });

  describe('validateSdkManifest', () => {
    it('deve aceitar manifest valido', () => {
      const manifest: PluginManifest = {
        id: 'test', name: 'Test', version: '1.0.0', minDevkitVersion: '2.0.0',
        description: 'desc', author: 'author',         permissions: ['read_file'], hooks: [], commands: [],
      };
      expect(validateSdkManifest(manifest)).toEqual([]);
    });

    it('deve rejeitar manifest sem campos obrigatorios', () => {
      const errors = validateSdkManifest({} as PluginManifest);
      expect(errors).toContain('Plugin id is required');
      expect(errors).toContain('Plugin name is required');
      expect(errors).toContain('Plugin version is required');
      expect(errors).toContain('Plugin minDevkitVersion is required');
    });

    it('deve rejeitar permissions nao array', () => {
      const errors = validateSdkManifest({
        id: 'p', name: 'P', version: '1', minDevkitVersion: '2',
        permissions: 'read_file', commands: [], hooks: [],
      } as unknown as PluginManifest);
      expect(errors).toContain('Permissions must be an array');
    });

    it('deve rejeitar commands nao array', () => {
      const errors = validateSdkManifest({
        id: 'p', name: 'P', version: '1', minDevkitVersion: '2',
        permissions: [], commands: 'not-array', hooks: [],
      } as unknown as PluginManifest);
      expect(errors).toContain('Commands must be an array');
    });
  });

  describe('loadPlugin', () => {
    it('deve carregar plugin valido', () => {
      const dir = path.join(tmpDir, '.ai', 'plugins', 'valid-plugin');
      const plugin = loadPlugin(dir);
      expect(plugin).not.toBeNull();
      expect(plugin!.manifest.id).toBe('valid-plugin');
      expect(plugin!.enabled).toBe(true);
    });

    it('deve retornar null para plugin sem index.js', () => {
      const dir = path.join(tmpDir, '.ai', 'plugins', 'no-index');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify({
        id: 'no-index', name: 'No Index', version: '1.0.0',
        minDevkitVersion: '2.0.0', description: 'No index.js', author: 'T',
        permissions: [], hooks: [], commands: [],
      }));
      const plugin = loadPlugin(dir);
      expect(plugin).not.toBeNull();
      expect(plugin!.enabled).toBe(false);
    });

    it('deve retornar null para manifest invalido', () => {
      const dir = path.join(tmpDir, 'invalid-manifest');
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'plugin.json'), JSON.stringify({ id: 'no-name' }));
      expect(loadPlugin(dir)).toBeNull();
    });
  });
});