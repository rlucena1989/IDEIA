import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { GoAdapter, createGoAdapter } from '../src/index';
import { generateHandler, scaffoldProject } from '../src/generator';

describe('GoAdapter', () => {
  let adapter: GoAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new GoAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'go-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('go');
    expect(adapter.capabilities).toContain('detect');
    expect(adapter.capabilities).toContain('init');
    expect(adapter.capabilities).toContain('generateHandler');
  });

  it('detect() should return true for go.mod', () => {
    fs.writeFileSync(path.join(tmpDir, 'go.mod'), 'module test');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return true when .go files exist', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.go'), 'package main');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project files', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, 'go.mod'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'cmd', 'main.go'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'Makefile'))).toBe(true);
  });

  it('init() with generateExample should create handler', async () => {
    const result = await adapter.init(tmpDir, { generateExample: 'users' });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'internal', 'users', 'users.go'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'internal', 'users', 'users_test.go'))).toBe(true);
  });

  it('generateHandler() should create Go handler files', async () => {
    await adapter.generateHandler('products', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'products.go'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'products_test.go'))).toBe(true);
  });

  it('generateTemplate() should delegate correctly', async () => {
    const result = await adapter.generateTemplate('items');
    expect(typeof result).toBe('string');
  });

  it('qualityGate() should detect missing go.mod', async () => {
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

  it('createGoAdapter factory works', () => {
    const instance = createGoAdapter({ projectRoot: tmpDir });
    expect(instance).toBeInstanceOf(GoAdapter);
    expect(instance.name).toBe('go');
  });

  it('scaffoldProject generates go.mod', () => {
    const files = scaffoldProject('test-app');
    const mod = files.find(f => f.path.endsWith('go.mod'));
    expect(mod).toBeDefined();
    expect(mod!.content).toContain('module test-app');
  });

  it('generateHandler creates valid Go code', () => {
    const files = generateHandler('test', tmpDir);
    expect(files.length).toBe(2);
    const goFile = files.find(f => f.path.endsWith('.go'));
    expect(goFile).toBeDefined();
    expect(goFile!.content).toContain('package test');
    expect(goFile!.content).toContain('CreateHandler');
  });
});
