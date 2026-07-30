import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GoAdapter, createGoAdapter } from '../src/index';
import { generateHandler } from '../src/generator';

let tmpDir: string;
let adapter: GoAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'go-advanced-'));
  adapter = createGoAdapter({ projectRoot: tmpDir });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('GoAdapter advanced', () => {

  describe('A. Scaffolding with different options', () => {
    it('init() with custom project name', async () => {
      const projectName = path.join(tmpDir, 'custom-go-app');
      const result = await adapter.init(projectName);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'go.mod'))).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'cmd', 'main.go'))).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'Makefile'))).toBe(true);
      const modContent = fs.readFileSync(path.join(projectName, 'go.mod'), 'utf-8');
      expect(modContent).toContain('module ' + projectName);
    });

    it('init() with generateExample creates handler files', async () => {
      const result = await adapter.init(tmpDir, { generateExample: 'handlers' });
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'internal', 'handlers', 'handlers.go'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'internal', 'handlers', 'handlers_test.go'))).toBe(true);
    });

    it('init() without options still scaffolds base project', async () => {
      const result = await adapter.init(tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'go.mod'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'cmd', 'main.go'))).toBe(true);
    });
  });

  describe('B. Detection in complex structures', () => {
    it('detect() returns false when subdirectory has go.mod but root is empty', () => {
      const subDir = path.join(tmpDir, 'nested', 'service');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'go.mod'), 'module nested/service');
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns false with partial markers (wrong file type)', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns false when wrong marker file exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'pom.xml'), '<project></project>');
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns true when go.mod exists at root', () => {
      fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module test');
      expect(adapter.detect(tmpDir)).toBe(true);
    });
  });

  describe('C. Incremental generation', () => {
    it('generateHandler() creates files with specific content patterns', async () => {
      await adapter.generateHandler('users', tmpDir);
      const handlerContent = fs.readFileSync(path.join(tmpDir, 'users.go'), 'utf-8');
      expect(handlerContent).toContain('package users');
      expect(handlerContent).toContain('CreateHandler');
      expect(handlerContent).toContain('ListHandler');

      const testContent = fs.readFileSync(path.join(tmpDir, 'users_test.go'), 'utf-8');
      expect(testContent).toContain('package users');
      expect(testContent).toContain('TestCreateHandler');
      expect(testContent).toContain('TestListHandler');
    });

    it('generateHandler() twice does not fail', async () => {
      await adapter.generateHandler('orders', tmpDir);
      await expect(adapter.generateHandler('orders', tmpDir)).resolves.not.toThrow();
      expect(fs.existsSync(path.join(tmpDir, 'orders.go'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'orders_test.go'))).toBe(true);
    });

    it('generateHandler produces proper HTTP handler structure', async () => {
      const files = generateHandler('products', tmpDir);
      const goFile = files.find(f => f.path.endsWith('products.go'));
      expect(goFile!.content).toContain('import');
      expect(goFile!.content).toContain('net/http');
      expect(goFile!.content).toContain('sync.RWMutex');
    });
  });

  describe('D. Edge cases', () => {
    it('qualityGate() on partially complete project', async () => {
      fs.mkdirSync(path.join(tmpDir, 'cmd'));
      fs.writeFileSync(path.join(tmpDir, 'cmd', 'main.go'), 'package main');
      const result = await adapter.qualityGate(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.issues).toContain('go.mod not found');
    });

    it('generateTemplate() with unknown template type', async () => {
      const result = await adapter.generateTemplate('unknown-handler');
      expect(typeof result).toBe('string');
    });

    it('runLint returns expected structure even when command fails', async () => {
      const result = await adapter.runLint(tmpDir);
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('output');
      expect(typeof result.output).toBe('string');
    });

    it('runTests returns expected structure even when command fails', async () => {
      const result = await adapter.runTests(tmpDir);
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('output');
      expect(typeof result.output).toBe('string');
    });

    it('runBuild returns expected structure even when command fails', async () => {
      const result = await adapter.runBuild(tmpDir);
      expect(result).toHaveProperty('success', false);
      expect(result).toHaveProperty('output');
      expect(typeof result.output).toBe('string');
    });

    it('qualityGate() has low score when checks fail', async () => {
      const result = await adapter.qualityGate(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThan(100);
      expect(result.issues.length).toBeGreaterThanOrEqual(1);
    });
  });
});
