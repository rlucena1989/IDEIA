import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { KotlinAdapter, createKotlinAdapter } from '../src/index';

describe('KotlinAdapter', () => {
  let adapter: KotlinAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new KotlinAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kt-test-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('kotlin');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect build.gradle.kts', () => {
    fs.writeFileSync(path.join(tmpDir, 'build.gradle.kts'), 'plugins { kotlin("jvm") }');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .kt files', () => {
    fs.writeFileSync(path.join(tmpDir, 'Main.kt'), 'fun main() {}');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
  });

  it('generateController() should create .kt files', async () => {
    await adapter.generateController('Product', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'ProductController.kt'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'ProductService.kt'))).toBe(true);
  });

  it('qualityGate() should detect missing build.gradle.kts', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
  });

  it('qualityGate() should pass with proper structure', async () => {
    fs.writeFileSync(path.join(tmpDir, 'build.gradle.kts'), '');
    fs.mkdirSync(path.join(tmpDir, 'src'));
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
  });

  it('createKotlinAdapter factory works', () => {
    expect(createKotlinAdapter()).toBeInstanceOf(KotlinAdapter);
  });
});
