import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { JavaAdapter, createJavaAdapter } from '../src/index';
import { generateController } from '../src/generator';

let tmpDir: string;
let adapter: JavaAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'java-advanced-'));
  adapter = createJavaAdapter({ projectRoot: tmpDir });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('JavaAdapter advanced', () => {

  describe('A. Scaffolding with different options', () => {
    it('init() with custom project name', async () => {
      const projectName = path.join(tmpDir, 'custom-java-app');
      const result = await adapter.init(projectName);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'pom.xml'))).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'src', 'main', 'resources', 'application.properties'))).toBe(true);
      const pomContent = fs.readFileSync(path.join(projectName, 'pom.xml'), 'utf-8');
      expect(pomContent).toContain('spring-boot-starter-parent');
    });

    it('init() with custom groupId', async () => {
      const result = await adapter.init(tmpDir, { groupId: 'com.mycompany', generateExample: 'items' });
      expect(result.success).toBe(true);
      const controllerDir = path.join(tmpDir, 'src', 'main', 'java', 'com', 'mycompany', 'items');
      expect(fs.existsSync(path.join(controllerDir, 'ItemsController.java'))).toBe(true);
      expect(fs.existsSync(path.join(controllerDir, 'Items.java'))).toBe(true);
    });

    it('init() with generateExample creates controller files', async () => {
      const result = await adapter.init(tmpDir, { generateExample: 'books', groupId: 'com.test' });
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'src', 'main', 'java', 'com', 'test', 'books', 'BooksController.java'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'src', 'main', 'java', 'com', 'test', 'books', 'Books.java'))).toBe(true);
    });

    it('init() without options uses default groupId', async () => {
      const result = await adapter.init(tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'pom.xml'))).toBe(true);
    });
  });

  describe('B. Detection in complex structures', () => {
    it('detect() returns false when subdirectory has pom.xml but root is empty', () => {
      const subDir = path.join(tmpDir, 'deep', 'module');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'pom.xml'), '<project></project>');
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() with partial markers (build.gradle but empty dir)', () => {
      fs.writeFileSync(path.join(tmpDir, 'build.gradle'), '');
      expect(adapter.detect(tmpDir)).toBe(true);
    });

    it('detect() returns false when wrong marker file exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module test');
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns true with .java files in nested packages', () => {
      const pkgDir = path.join(tmpDir, 'src', 'main', 'java', 'com', 'example');
      fs.mkdirSync(pkgDir, { recursive: true });
      fs.writeFileSync(path.join(pkgDir, 'App.java'), 'class App {}');
      expect(adapter.detect(tmpDir)).toBe(true);
    });

    it('detect() returns true for build.gradle.kts', () => {
      fs.writeFileSync(path.join(tmpDir, 'build.gradle.kts'), 'plugins {}');
      expect(adapter.detect(tmpDir)).toBe(true);
    });
  });

  describe('C. Incremental generation', () => {
    it('generateController() creates files with specific content patterns', async () => {
      await adapter.generateController('inventory', tmpDir);
      const controllerContent = fs.readFileSync(path.join(tmpDir, 'InventoryController.java'), 'utf-8');
      expect(controllerContent).toContain('@RestController');
      expect(controllerContent).toContain('InventoryController');
      expect(controllerContent).toContain('@RequestMapping');
      expect(controllerContent).toContain('@PostMapping');
      expect(controllerContent).toContain('@GetMapping');

      const modelContent = fs.readFileSync(path.join(tmpDir, 'Inventory.java'), 'utf-8');
      expect(modelContent).toContain('record Inventory');
    });

    it('generateController() twice does not fail', async () => {
      await adapter.generateController('orders', tmpDir);
      await expect(adapter.generateController('orders', tmpDir)).resolves.not.toThrow();
      expect(fs.existsSync(path.join(tmpDir, 'OrdersController.java'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'Orders.java'))).toBe(true);
    });

    it('generateController produces valid Spring Boot structure', async () => {
      const files = generateController('com.example.products', 'products', tmpDir);
      const controller = files.find(f => f.path.endsWith('ProductsController.java'));
      expect(controller!.content).toContain('package com.example.products');
      expect(controller!.content).toContain('import org.springframework.web.bind.annotation');
    });
  });

  describe('D. Edge cases', () => {
    it('qualityGate() on partially complete project', async () => {
      fs.writeFileSync(path.join(tmpDir, 'pom.xml'), '<project></project>');
      const result = await adapter.qualityGate(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.issues).toContain('src/ directory not found');
    });

    it('generateTemplate() with unknown template type', async () => {
      const result = await adapter.generateTemplate('unknown-entity');
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
