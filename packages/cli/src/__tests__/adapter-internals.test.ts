import { findMonorepoRoot, listAdapters, detectProjectStack } from '../commands/adapter';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('adapter internals', () => {
let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'gti-adapter-test-'));
  // Create a simulated monorepo structure
    fs.mkdirSync(path.join(tmpDir, 'packages', 'adapter-go', 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'packages', 'adapter-go', 'package.json'), JSON.stringify({ name: '@ideia/adapter-go', version: '1.0.0' }));
    fs.writeFileSync(path.join(tmpDir, 'packages', 'adapter-go', 'README.md'), '# adapter-go');

    fs.mkdirSync(path.join(tmpDir, 'packages', 'adapter-nestjs'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'packages', 'adapter-nestjs', 'package.json'), JSON.stringify({ name: '@ideia/adapter-nestjs', version: '1.0.0' }));
    fs.writeFileSync(path.join(tmpDir, 'packages', 'adapter-nestjs', 'index.js'), 'module.exports = {};');

    // A non-adapter package to test filtering
    fs.mkdirSync(path.join(tmpDir, 'packages', 'cli'), { recursive: true });

    // A package with package.json content for stack detection
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({
      dependencies: { '@nestjs/core': '^10.0.0', express: '^4.0.0' },
      devDependencies: { fastify: '^4.0.0' },
    }));
  });

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

  describe('findMonorepoRoot', () => {
    it('deve encontrar root a partir de subdiretorio', () => {
      const root = findMonorepoRoot(path.join(tmpDir, 'packages', 'cli'));
      expect(root).toBe(tmpDir);
    });

    it('deve retornar null se packages/ nao existir', () => {
      // Use C:\ directly — guaranteed no packages/ subdir at root
      const root = findMonorepoRoot('C:\\');
      expect(root).toBeNull();
    });

    it('deve retornar null se exceder profundidade maxima', () => {
      const deep = path.join(os.tmpdir(), 'a', 'b', 'c', 'd', 'e', 'f', 'g');
      fs.mkdirSync(deep, { recursive: true });
      const root = findMonorepoRoot(deep);
      expect(root).toBeNull();
    });
  });

  describe('listAdapters', () => {
    it('deve listar apenas adapters (prefixo adapter-)', () => {
      const adapters = listAdapters(tmpDir);
      expect(adapters.length).toBe(2);
      const names = adapters.map(a => a.name);
      expect(names).toContain('adapter-go');
      expect(names).toContain('adapter-nestjs');
      expect(names).not.toContain('cli');
    });

    it('deve detectar package.json corretamente', () => {
      const adapters = listAdapters(tmpDir);
      const go = adapters.find(a => a.name === 'adapter-go')!;
      expect(go.hasPackageJson).toBe(true);
      const nestjs = adapters.find(a => a.name === 'adapter-nestjs')!;
      expect(nestjs.hasPackageJson).toBe(true);
    });

    it('deve detectar README.md corretamente', () => {
      const adapters = listAdapters(tmpDir);
      const go = adapters.find(a => a.name === 'adapter-go')!;
      expect(go.hasReadme).toBe(true);
    });

    it('deve detectar src/ ou index corretamente', () => {
      const adapters = listAdapters(tmpDir);
      const go = adapters.find(a => a.name === 'adapter-go')!;
      expect(go.hasSrcOrIndex).toBe(true);
      const nestjs = adapters.find(a => a.name === 'adapter-nestjs')!;
      expect(nestjs.hasSrcOrIndex).toBe(true);
    });
  });

  describe('detectProjectStack', () => {
    it('deve detectar nestjs, express e fastify do package.json', () => {
      const stack = detectProjectStack(tmpDir);
      expect(stack).toContain('nestjs');
      expect(stack).toContain('express');
      expect(stack).toContain('fastify');
    });

    it('deve retornar array vazio para diretorio sem package.json', () => {
      const emptyDir = path.join(os.tmpdir(), `empty-stack-${Date.now()}`);
      fs.mkdirSync(emptyDir, { recursive: true });
      const stack = detectProjectStack(emptyDir);
      expect(stack).toEqual([]);
    });

    it('deve lidar com package.json invalido', () => {
      const badDir = path.join(os.tmpdir(), `bad-pkg-${Date.now()}`);
      fs.mkdirSync(badDir, { recursive: true });
      fs.writeFileSync(path.join(badDir, 'package.json'), 'not-json');
      const stack = detectProjectStack(badDir);
      expect(stack).toEqual(['unknown (package.json inválido)']);
    });

    it('deve detectar fastapi via requirements.txt', () => {
      const dir = path.join(os.tmpdir(), `fastapi-pkg-${Date.now()}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'requirements.txt'), 'fastapi==0.100.0\n');
      const stack = detectProjectStack(dir);
      expect(stack).toContain('fastapi');
    });

    it('deve detectar go via go.mod', () => {
      const dir = path.join(os.tmpdir(), `go-pkg-${Date.now()}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'go.mod'), 'module github.com/example/app\n');
      const stack = detectProjectStack(dir);
      expect(stack).toContain('go');
    });

    it('deve detectar nexjs via next no package.json', () => {
      const dir = path.join(os.tmpdir(), `next-pkg-${Date.now()}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { next: '^14.0.0' } }));
      const stack = detectProjectStack(dir);
      expect(stack).toContain('nextjs');
    });

    it('deve combinar stack detectada com go.mod e package.json simultaneamente', () => {
      const dir = path.join(os.tmpdir(), `combo-pkg-${Date.now()}`);
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ dependencies: { '@nestjs/core': '^10.0.0' } }));
      fs.writeFileSync(path.join(dir, 'go.mod'), 'module app\n');
      const stack = detectProjectStack(dir);
      expect(stack).toContain('nestjs');
      expect(stack).toContain('go');
    });
  });

  describe('listAdapters edge cases', () => {
    it('deve detectar adapter sem package.json como hasPackageJson=false', () => {
      const dir = path.join(os.tmpdir(), `adapter-no-pkg-${Date.now()}`);
      fs.mkdirSync(path.join(dir, 'packages', 'adapter-minimal', 'src'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'packages', 'adapter-minimal', 'README.md'), '# minimal');
      const adapters = listAdapters(dir);
      const minimal = adapters.find(a => a.name === 'adapter-minimal');
      expect(minimal).toBeDefined();
      expect(minimal!.hasPackageJson).toBe(false);
      expect(minimal!.hasReadme).toBe(true);
      expect(minimal!.hasSrcOrIndex).toBe(true);
    });

    it('deve detectar README em lowercase', () => {
      const dir = path.join(os.tmpdir(), `adapter-readme-${Date.now()}`);
      fs.mkdirSync(path.join(dir, 'packages', 'adapter-lc'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'packages', 'adapter-lc', 'readme.md'), '# lowercase');
      const adapters = listAdapters(dir);
      const lc = adapters.find(a => a.name === 'adapter-lc');
      expect(lc).toBeDefined();
      expect(lc!.hasReadme).toBe(true);
    });

    it('deve detectar entrypoint index.ts', () => {
      const dir = path.join(os.tmpdir(), `adapter-idx-${Date.now()}`);
      fs.mkdirSync(path.join(dir, 'packages', 'adapter-idx'), { recursive: true });
      fs.writeFileSync(path.join(dir, 'packages', 'adapter-idx', 'index.ts'), '');
      const adapters = listAdapters(dir);
      const idx = adapters.find(a => a.name === 'adapter-idx');
      expect(idx).toBeDefined();
      expect(idx!.hasSrcOrIndex).toBe(true);
    });

    it('deve retornar array vazio quando packages/ nao existe', () => {
      const dir = path.join(os.tmpdir(), `no-packages-${Date.now()}`);
      fs.mkdirSync(dir, { recursive: true });
      const adapters = listAdapters(dir);
      expect(adapters).toEqual([]);
    });

    it('deve retornar array vazio quando packages/ existe mas esta vazia', () => {
      const dir = path.join(os.tmpdir(), `empty-packages-${Date.now()}`);
      fs.mkdirSync(path.join(dir, 'packages'), { recursive: true });
      const adapters = listAdapters(dir);
      expect(adapters).toEqual([]);
    });
  });

  describe('detectProjectStack edge cases', () => {
    it('deve retornar array vazio para diretorio sem package.json', () => {
      const emptyDir = path.join(os.tmpdir(), `empty-stack-${Date.now()}`);
      fs.mkdirSync(emptyDir, { recursive: true });
      const stack = detectProjectStack(emptyDir);
      expect(stack).toEqual([]);
    });

    it('deve lidar com package.json invalido', () => {
      const badDir = path.join(os.tmpdir(), `bad-pkg-${Date.now()}`);
      fs.mkdirSync(badDir, { recursive: true });
      fs.writeFileSync(path.join(badDir, 'package.json'), 'not-json');
      const stack = detectProjectStack(badDir);
      expect(stack).toEqual(['unknown (package.json inválido)']);
    });
  });
});