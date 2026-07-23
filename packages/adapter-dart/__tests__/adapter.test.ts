import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DartAdapter, createDartAdapter } from '../src/index';
import { generateEntity, scaffoldProject } from '../src/generator';

describe('DartAdapter', () => {
  let adapter: DartAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new DartAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dart-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('dart');
    expect(adapter.capabilities).toContain('detect');
    expect(adapter.capabilities).toContain('init');
    expect(adapter.capabilities).toContain('generateEntity');
  });

  it('detect() should detect pubspec.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pubspec.yaml'), 'name: test');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .dart files', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.dart'), 'void main() {}');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold Dart project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, 'pubspec.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'analysis_options.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'bin', 'main.dart'))).toBe(true);
  });

  it('init() with generateExample should create entity', async () => {
    const result = await adapter.init(tmpDir, { generateExample: 'user' });
    expect(result.success).toBe(true);
    const entityDir = path.join(tmpDir, 'lib', 'user');
    expect(fs.existsSync(path.join(entityDir, 'domain', 'entity', 'user.dart'))).toBe(true);
    expect(fs.existsSync(path.join(entityDir, 'domain', 'repository', 'user_repository.dart'))).toBe(true);
  });

  it('generateEntity() should create Dart files', async () => {
    await adapter.generateEntity('product', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'domain', 'entity', 'product.dart'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'application', 'usecase', 'product_usecase.dart'))).toBe(true);
  });

  it('generateTemplate() should delegate correctly', async () => {
    const result = await adapter.generateTemplate('item');
    expect(typeof result).toBe('string');
  });

  it('qualityGate() should detect missing pubspec.yaml', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('createDartAdapter factory works', () => {
    const instance = createDartAdapter({ projectRoot: tmpDir });
    expect(instance).toBeInstanceOf(DartAdapter);
    expect(instance.name).toBe('dart');
  });

  it('scaffoldProject generates pubspec.yaml', () => {
    const files = scaffoldProject('test-dart');
    const yaml = files.find(f => f.path.endsWith('pubspec.yaml'));
    expect(yaml).toBeDefined();
    expect(yaml!.content).toContain('name: test-dart');
  });

  it('generateEntity creates valid Dart code', () => {
    const files = generateEntity('test_entity', tmpDir);
    expect(files.length).toBe(4);
    const entity = files.find(f => f.path.includes('test_entity.dart'));
    expect(entity).toBeDefined();
    expect(entity!.content).toContain('class TestEntity');
    expect(entity!.content).toContain('fromJson');
    expect(entity!.content).toContain('toJson');
  });
});
