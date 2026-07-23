import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FastAPIAdapter, createFastAPIAdapter } from '../src/index';
import { generateRouter, scaffoldProject } from '../src/generator';

describe('FastAPIAdapter', () => {
  let adapter: FastAPIAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new FastAPIAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fastapi-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('fastapi');
    expect(adapter.capabilities).toContain('detect');
    expect(adapter.capabilities).toContain('init');
    expect(adapter.capabilities).toContain('generateRouter');
  });

  it('detect() should detect pyproject.toml', () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "test"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect fastapi in requirements.txt', () => {
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'fastapi>=0.109.0');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for non-fastapi project', () => {
    fs.writeFileSync(path.join(tmpDir, 'requirements.txt'), 'flask>=2.0.0');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false when no config files exist', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project files', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(result.files.length).toBeGreaterThan(0);
    expect(fs.existsSync(path.join(tmpDir, 'pyproject.toml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'main.py'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'requirements.txt'))).toBe(true);
  });

  it('init() with generateExample should create router', async () => {
    const result = await adapter.init(tmpDir, { generateExample: 'items' });
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'routers', 'items.py'))).toBe(true);
  });

  it('generateRouter() should create router files', async () => {
    await adapter.generateRouter('products', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'products.py'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'schemas.py'))).toBe(true);
  });

  it('generateTemplate() should delegate to generateRouter', async () => {
    const result = await adapter.generateTemplate('users');
    expect(typeof result).toBe('string');
  });

  it('qualityGate() should detect missing structure', async () => {
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

  it('createFastAPIAdapter factory works', () => {
    const instance = createFastAPIAdapter({ projectRoot: tmpDir });
    expect(instance).toBeInstanceOf(FastAPIAdapter);
    expect(instance.name).toBe('fastapi');
  });

  it('scaffoldProject generates pyproject.toml', () => {
    const files = scaffoldProject('test-api');
    const toml = files.find(f => f.path.endsWith('pyproject.toml'));
    expect(toml).toBeDefined();
    expect(toml!.content).toContain('fastapi');
  });

  it('generateRouter creates valid Python files', () => {
    const files = generateRouter('test', tmpDir);
    expect(files.length).toBe(2);
    const pyFile = files.find(f => f.path.endsWith('test.py'));
    expect(pyFile).toBeDefined();
    expect(pyFile!.content).toContain('APIRouter');
    expect(pyFile!.content).toContain('TestCreate');
  });
});
