import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NestJSAdapter, createNestJSAdapter } from '../src/index';
import { generateNestModule } from '../src/generator';

let tmpDir: string;
let adapter: NestJSAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nestjs-advanced-'));
  adapter = createNestJSAdapter({ projectRoot: tmpDir });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('NestJSAdapter advanced', () => {

  describe('A. Scaffolding with different options', () => {
    it('init() with custom project name', async () => {
      const projectName = path.join(tmpDir, 'custom-nest-app');
      const result = await adapter.init(projectName);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'nest-cli.json'))).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'src', 'main.ts'))).toBe(true);
      const pkg = JSON.parse(fs.readFileSync(path.join(projectName, 'package.json'), 'utf-8'));
      expect(pkg.name).toBe(projectName);
    });

    it('init() with generateExample creates example module', async () => {
      const result = await adapter.init(tmpDir, { generateExample: 'cats' });
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'src', 'cats', 'cats.module.ts'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'src', 'cats', 'cats.controller.ts'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'src', 'cats', 'cats.service.ts'))).toBe(true);
    });

    it('init() without generateExample still scaffolds base project', async () => {
      const result = await adapter.init(tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'nest-cli.json'))).toBe(true);
    });
  });

  describe('B. Detection in complex structures', () => {
    it('detect() returns false when subdirectory has nestjs markers but root is empty', () => {
      const subDir = path.join(tmpDir, 'sub', 'project');
      fs.mkdirSync(subDir, { recursive: true });
      const pkg = { dependencies: { '@nestjs/core': '^10.0.0' } };
      fs.writeFileSync(path.join(subDir, 'package.json'), JSON.stringify(pkg));
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() with partial marker (package.json without nestjs dependency)', () => {
      const pkg = { dependencies: { express: '^4.0.0' } };
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns false when wrong marker file exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module test');
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'test' }));
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns false with malformed package.json', () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), 'not-json');
      expect(adapter.detect(tmpDir)).toBe(false);
    });
  });

  describe('C. Incremental generation', () => {
    it('generateModule() creates files with specific content patterns', async () => {
      await adapter.generateModule('inventory', tmpDir);
      const moduleContent = fs.readFileSync(path.join(tmpDir, 'inventory.module.ts'), 'utf-8');
      expect(moduleContent).toContain('@Module');
      expect(moduleContent).toContain('InventoryModule');
      expect(moduleContent).toContain('InventoryController');
      expect(moduleContent).toContain('InventoryService');

      const controllerContent = fs.readFileSync(path.join(tmpDir, 'inventory.controller.ts'), 'utf-8');
      expect(controllerContent).toContain('@Controller');
      expect(controllerContent).toContain('InventoryController');

      const serviceContent = fs.readFileSync(path.join(tmpDir, 'inventory.service.ts'), 'utf-8');
      expect(serviceContent).toContain('@Injectable');
      expect(serviceContent).toContain('InventoryService');
    });

    it('generateModule() twice does not fail', async () => {
      await adapter.generateModule('orders', tmpDir);
      await expect(adapter.generateModule('orders', tmpDir)).resolves.not.toThrow();
      expect(fs.existsSync(path.join(tmpDir, 'orders.module.ts'))).toBe(true);
    });

    it('generateNestModule produces valid import/export structure', async () => {
      const files = generateNestModule('analytics', tmpDir);
      const modFile = files.find(f => f.path.endsWith('analytics.module.ts'));
      expect(modFile!.content).toContain('export class AnalyticsModule');
    });
  });

  describe('D. Edge cases', () => {
    it('qualityGate() on partially complete project', async () => {
      fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify({ name: 'partial' }));
      fs.mkdirSync(path.join(tmpDir, 'src'));
      const result = await adapter.qualityGate(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.issues).toContain('tsconfig.json not found');
      expect(result.issues).toContain('nest-cli.json not found');
    });

    it('generateTemplate() with unknown template type', async () => {
      const result = await adapter.generateTemplate('unknown-type');
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

    it('qualityGate() score is 0 when all files missing', async () => {
      const result = await adapter.qualityGate(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues.length).toBe(4);
    });
  });
});
