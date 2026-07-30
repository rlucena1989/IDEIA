import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PhpAdapter, createPhpAdapter } from '../src/index';

let tmpDir: string;
let adapter: PhpAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'php-advanced-'));
  adapter = createPhpAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('PhpAdapter advanced', () => {
  it('init() with custom project name should scaffold under that name', async () => {
    const result = await adapter.init(path.join(tmpDir, 'my_php_app'));
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_php_app', 'composer.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_php_app', 'public', 'index.php'))).toBe(true);
  });

  it('detect() should return false when marker file is in subdirectory but not root', () => {
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'composer.json'), '{"name":"sub/app"}');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false when wrong marker file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"test"}');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('generateController() should work incrementatively with multiple controllers', async () => {
    await adapter.init(tmpDir);
    await adapter.generateController('User', path.join(tmpDir, 'src', 'Controllers'));
    await adapter.generateController('Admin', path.join(tmpDir, 'src', 'Controllers'));
    expect(fs.existsSync(path.join(tmpDir, 'src', 'Controllers', 'UserController.php'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'Controllers', 'AdminController.php'))).toBe(true);
  });

  it('qualityGate() should fail on partially complete project', async () => {
    fs.writeFileSync(path.join(tmpDir, 'composer.json'), '{"name":"partial/app"}');
    fs.mkdirSync(path.join(tmpDir, 'public'));
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('public/index.php not found');
  });

  it('generateTemplate() with unknown type should still return a string', async () => {
    const result = await adapter.generateTemplate('__unknown__');
    expect(typeof result).toBe('string');
  });

  it('factory function should return correct adapter type', () => {
    const instance = createPhpAdapter();
    expect(instance).toBeInstanceOf(PhpAdapter);
    expect(instance.name).toBe('php');
  });
});
