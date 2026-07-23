import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ScalaAdapter, createScalaAdapter } from '../src/index';

describe('ScalaAdapter', () => {
  let adapter: ScalaAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new ScalaAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'scala-test-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('scala');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect build.sbt', () => {
    fs.writeFileSync(path.join(tmpDir, 'build.sbt'), 'name := "test"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .scala files', () => {
    fs.writeFileSync(path.join(tmpDir, 'Main.scala'), 'object Main');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'build.sbt'))).toBe(true);
  });

  it('generateController() should create .scala files', async () => {
    await adapter.generateController('Product', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'ProductController.scala'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'ProductService.scala'))).toBe(true);
  });

  it('qualityGate() should detect missing build.sbt', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
  });

  it('createScalaAdapter factory works', () => {
    expect(createScalaAdapter()).toBeInstanceOf(ScalaAdapter);
  });
});
