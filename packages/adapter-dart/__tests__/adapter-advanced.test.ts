import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DartAdapter, createDartAdapter } from '../src/index';

let tmpDir: string;
let adapter: DartAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-advanced-'));
  adapter = createDartAdapter({ projectRoot: tmpDir });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('DartAdapter advanced', () => {
  it('init() with custom project name should scaffold under that name', async () => {
    const result = await adapter.init(path.join(tmpDir, 'my_dart_app'));
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_dart_app', 'pubspec.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_dart_app', 'bin', 'main.dart'))).toBe(true);
  });

  it('detect() should return false when marker file is in subdirectory but not root', () => {
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'pubspec.yaml'), 'name: sub');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false when wrong marker file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"test"}');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('generateEntity() should work incrementatively with multiple entities', async () => {
    await adapter.init(tmpDir);
    await adapter.generateEntity('User', path.join(tmpDir, 'lib', 'User'));
    await adapter.generateEntity('Product', path.join(tmpDir, 'lib', 'Product'));
    expect(fs.existsSync(path.join(tmpDir, 'lib', 'User', 'domain', 'entity', 'User.dart'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'lib', 'Product', 'domain', 'entity', 'Product.dart'))).toBe(true);
  });

  it('qualityGate() should fail on partially complete project', async () => {
    fs.mkdirSync(path.join(tmpDir, 'lib'));
    fs.mkdirSync(path.join(tmpDir, 'bin'));
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('pubspec.yaml not found');
  });

  it('generateTemplate() with unknown type should still return a string', async () => {
    const result = await adapter.generateTemplate('__unknown__');
    expect(typeof result).toBe('string');
  });

  it('config should be passed correctly to constructor', () => {
    const customRoot = path.join(os.tmpdir(), 'config-root-test');
    const configured = createDartAdapter({ projectRoot: customRoot });
    expect(configured).toBeInstanceOf(DartAdapter);
    expect(configured.name).toBe('dart');
  });

  it('factory function should return correct adapter type', () => {
    const instance = createDartAdapter();
    expect(instance).toBeInstanceOf(DartAdapter);
    expect(instance.name).toBe('dart');
  });
});
