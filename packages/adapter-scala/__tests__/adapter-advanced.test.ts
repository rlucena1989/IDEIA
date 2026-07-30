import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ScalaAdapter, createScalaAdapter } from '../src/index';

let tmpDir: string;
let adapter: ScalaAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sc-advanced-'));
  adapter = createScalaAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ScalaAdapter advanced', () => {
  it('init should accept custom project name and create structure', async () => {
    const result = await adapter.init('MyScalaApp');
    expect(result.success).toBe(true);
    expect(result.files).toContain('MyScalaApp');
  });

  it('detect should return true for build.sbt', () => {
    fs.writeFileSync(path.join(tmpDir, 'build.sbt'), 'name := "test"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return true for .scala files', () => {
    fs.writeFileSync(path.join(tmpDir, 'Main.scala'), 'object Main');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect should return false for unrelated files', () => {
    fs.writeFileSync(path.join(tmpDir, 'data.csv'), 'a,b,c');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('qualityGate should fail on empty directory', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('qualityGate should pass on full scala project', async () => {
    fs.writeFileSync(path.join(tmpDir, 'build.sbt'), 'name := "test"');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'Main.scala'), 'object Main');
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('generateTemplate should delegate to generateController with unknown type', async () => {
    const dir = await adapter.generateTemplate('UnknownType');
    expect(typeof dir).toBe('string');
  });

  it('generateController should create scala controller file', async () => {
    const dir = await adapter.generateController('Users', tmpDir);
    expect(fs.existsSync(path.join(dir, 'UsersController.scala'))).toBe(true);
  });

  it('createScalaAdapter factory should create correct instance', () => {
    const instance = createScalaAdapter();
    expect(instance).toBeInstanceOf(ScalaAdapter);
    expect(instance.name).toBe('scala');
    expect(instance.capabilities).toContain('generateController');
  });

  it('generateTemplate should produce string output', async () => {
    const result = await adapter.generateTemplate('Service');
    expect(typeof result).toBe('string');
  });

  it('init should handle failure gracefully', async () => {
    const result = await adapter.init('');
    expect(typeof result.success).toBe('boolean');
    expect(Array.isArray(result.files)).toBe(true);
  });
});
