import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KotlinAdapter, createKotlinAdapter } from '../src/index';

let tmpDir: string;
let adapter: KotlinAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kt-advanced-'));
  adapter = createKotlinAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('KotlinAdapter advanced', () => {

  describe('A. Scaffolding with different options', () => {
    it('init() with custom project name', async () => {
      const projectName = path.join(tmpDir, 'custom-kt-app');
      const result = await adapter.init(projectName);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'build.gradle.kts'))).toBe(true);
      expect(fs.existsSync(path.join(projectName, 'src', 'main', 'kotlin', 'com', 'example', 'Application.kt'))).toBe(true);
      const buildContent = fs.readFileSync(path.join(projectName, 'build.gradle.kts'), 'utf-8');
      expect(buildContent).toContain('org.springframework.boot');
    });

    it('init() without options scaffolds base project', async () => {
      const result = await adapter.init(tmpDir);
      expect(result.success).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'build.gradle.kts'))).toBe(true);
    });
  });

  describe('B. Detection in complex structures', () => {
    it('detect() returns false when subdirectory has build.gradle.kts but root is empty', () => {
      const subDir = path.join(tmpDir, 'module', 'sub');
      fs.mkdirSync(subDir, { recursive: true });
      fs.writeFileSync(path.join(subDir, 'build.gradle.kts'), 'plugins {}');
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() with partial markers (no .kt files, no build.gradle.kts)', () => {
      fs.writeFileSync(path.join(tmpDir, 'README.md'), '# project');
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns false when wrong marker file exists', () => {
      fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module test');
      expect(adapter.detect(tmpDir)).toBe(false);
    });

    it('detect() returns true with .kt files in nested dirs', () => {
      const srcDir = path.join(tmpDir, 'kotlin', 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'Main.kt'), 'fun main() {}');
      expect(adapter.detect(tmpDir)).toBe(true);
    });
  });

  describe('C. Incremental generation', () => {
    it('generateController() creates files with specific content patterns', async () => {
      await adapter.generateController('Product', tmpDir);
      const controllerContent = fs.readFileSync(path.join(tmpDir, 'ProductController.kt'), 'utf-8');
      expect(controllerContent).toContain('@RestController');
      expect(controllerContent).toContain('ProductController');
      expect(controllerContent).toContain('@RequestMapping');
      expect(controllerContent).toContain('@PostMapping');
      expect(controllerContent).toContain('@GetMapping');
      expect(controllerContent).toContain('@DeleteMapping');

      const serviceContent = fs.readFileSync(path.join(tmpDir, 'ProductService.kt'), 'utf-8');
      expect(serviceContent).toContain('@Service');
      expect(serviceContent).toContain('ProductService');
    });

    it('generateController() twice does not fail', async () => {
      await adapter.generateController('Order', tmpDir);
      await expect(adapter.generateController('Order', tmpDir)).resolves.not.toThrow();
      expect(fs.existsSync(path.join(tmpDir, 'OrderController.kt'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'OrderService.kt'))).toBe(true);
    });

    it('generateController produces valid Spring Boot structure', async () => {
      await adapter.generateController('Analytics', tmpDir);
      const controllerContent = fs.readFileSync(path.join(tmpDir, 'AnalyticsController.kt'), 'utf-8');
      expect(controllerContent).toContain('data class Analytics');
      expect(controllerContent).toContain('ResponseEntity');
      expect(controllerContent).toContain('ConcurrentHashMap');
    });
  });

  describe('D. Edge cases', () => {
    it('qualityGate() on partially complete project', async () => {
      fs.mkdirSync(path.join(tmpDir, 'src'));
      const result = await adapter.qualityGate(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(100);
      expect(result.issues).toContain('build.gradle.kts not found');
    });

    it('generateTemplate() with unknown template type', async () => {
      const result = await adapter.generateTemplate('unknown-controller');
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

    it('qualityGate() score is 0 when all checks fail', async () => {
      const result = await adapter.qualityGate(tmpDir);
      expect(result.passed).toBe(false);
      expect(result.score).toBe(0);
      expect(result.issues.length).toBeGreaterThanOrEqual(2);
    });
  });
});
