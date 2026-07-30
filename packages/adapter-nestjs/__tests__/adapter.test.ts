import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { NestJSAdapter, createNestJSAdapter } from '../src/index';
import { generateNestModule, scaffoldProject } from '../src/generator';

describe('NestJSAdapter', () => {
  let adapter: NestJSAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new NestJSAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'nest-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('nestjs');
    expect(adapter.capabilities).toContain('detect');
    expect(adapter.capabilities).toContain('init');
    expect(adapter.capabilities).toContain('generateModule');
  });

  it('detect() should return true for nestjs project', () => {
    const pkg = { dependencies: { '@nestjs/core': '^10.0.0' } };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for non-nestjs project', () => {
    const pkg = { dependencies: { express: '^4.0.0' } };
    fs.writeFileSync(path.join(tmpDir, 'package.json'), JSON.stringify(pkg));
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false when package.json missing', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project files', async () => {
    const result = await adapter.init(tmpDir, { generateExample: 'users' });
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'nest-cli.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'main.ts'))).toBe(true);
  });

  it('generateModule() should create module files', async () => {
    const moduleDir = await adapter.generateModule('products', tmpDir);
    expect(fs.existsSync(path.join(moduleDir, 'products.module.ts'))).toBe(true);
    expect(fs.existsSync(path.join(moduleDir, 'products.controller.ts'))).toBe(true);
    expect(fs.existsSync(path.join(moduleDir, 'products.service.ts'))).toBe(true);
    expect(fs.existsSync(path.join(moduleDir, 'dto', 'create-products.dto.ts'))).toBe(true);
  });

  it('generateTemplate() should produce valid code', async () => {
    const code = await adapter.generateTemplate('items');
    expect(code).toBeTruthy();
    expect(fs.existsSync(path.join(code, 'items.module.ts'))).toBe(true);
  });

  it('qualityGate() should check project structure', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('issues');
    expect(typeof result.score).toBe('number');
  });

  it('qualityGate() should detect missing files', async () => {
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

  it('createNestJSAdapter factory works', () => {
    const instance = createNestJSAdapter({ projectRoot: tmpDir });
    expect(instance).toBeInstanceOf(NestJSAdapter);
    expect(instance.name).toBe('nestjs');
  });

  it('validateContracts() returns structure', async () => {
    const result = await adapter.validateContracts(tmpDir);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
  });

  it('auditSecurity() returns structure', async () => {
    const result = await adapter.auditSecurity(tmpDir);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
  });

  it('scaffoldProject generates package.json with nest dependencies', () => {
    const files = scaffoldProject('test-proj');
    const pkgFile = files.find(f => f.path.endsWith('package.json'));
    expect(pkgFile).toBeDefined();
    const pkg = JSON.parse(pkgFile!.content);
    expect(pkg.dependencies['@nestjs/core']).toBeDefined();
  });

  it('generateNestModule creates valid TypeScript files', () => {
    const files = generateNestModule('test', tmpDir);
    expect(files.length).toBe(6);
    const moduleFile = files.find(f => f.path.endsWith('test.module.ts'));
    expect(moduleFile).toBeDefined();
    expect(moduleFile!.content).toContain('@Module');
    expect(moduleFile!.content).toContain('TestModule');
  });

  it('runLint returns expected structure', async () => {
    const result = await adapter.runLint(tmpDir);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
  });

  it('runTests returns expected structure', async () => {
    const result = await adapter.runTests(tmpDir);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
  });

  it('runBuild returns expected structure', async () => {
    const result = await adapter.runBuild(tmpDir);
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('output');
  });
});
