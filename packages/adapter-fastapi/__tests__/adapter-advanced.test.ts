import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { FastAPIAdapter, createFastAPIAdapter } from '../src/index';

let tmpDir: string;
let adapter: FastAPIAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'fastapi-advanced-'));
  adapter = createFastAPIAdapter({ projectRoot: tmpDir });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('FastAPIAdapter advanced', () => {
  it('init() with custom project name should scaffold under that name', async () => {
    const result = await adapter.init(path.join(tmpDir, 'my_fastapi_app'));
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_fastapi_app', 'pyproject.toml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_fastapi_app', 'src', 'main.py'))).toBe(true);
  });

  it('detect() should return false when marker file is in subdirectory but not root', () => {
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'pyproject.toml'), '[project]\nname = "sub"');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false when wrong marker file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'Makefile'), 'build:\n\techo ok');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('generateRouter() should work incrementatively with multiple routers', async () => {
    await adapter.init(tmpDir);
    await adapter.generateRouter('items', path.join(tmpDir, 'src', 'routers'));
    await adapter.generateRouter('orders', path.join(tmpDir, 'src', 'routers'));
    expect(fs.existsSync(path.join(tmpDir, 'src', 'routers', 'items.py'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'routers', 'orders.py'))).toBe(true);
  });

  it('qualityGate() should fail on partially complete project', async () => {
    fs.writeFileSync(path.join(tmpDir, 'pyproject.toml'), '[project]\nname = "partial"');
    fs.mkdirSync(path.join(tmpDir, 'src'));
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('src/main.py not found');
  });

  it('generateTemplate() with unknown type should still return a string', async () => {
    const result = await adapter.generateTemplate('__unknown__');
    expect(typeof result).toBe('string');
  });

  it('config should be passed correctly to constructor', () => {
    const customRoot = path.join(os.tmpdir(), 'config-root-test');
    const configured = createFastAPIAdapter({ projectRoot: customRoot });
    expect(configured).toBeInstanceOf(FastAPIAdapter);
    expect(configured.name).toBe('fastapi');
  });

  it('factory function should return correct adapter type', () => {
    const instance = createFastAPIAdapter();
    expect(instance).toBeInstanceOf(FastAPIAdapter);
    expect(instance.name).toBe('fastapi');
  });
});
