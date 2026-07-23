import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { PhpAdapter, createPhpAdapter } from '../src/index';

describe('PhpAdapter', () => {
  let adapter: PhpAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new PhpAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'php-test-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('php');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect composer.json', () => {
    fs.writeFileSync(path.join(tmpDir, 'composer.json'), '{}');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .php files', () => {
    fs.writeFileSync(path.join(tmpDir, 'index.php'), '<?php');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'composer.json'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'public', 'index.php'))).toBe(true);
  });

  it('generateController() should create .php files', async () => {
    await adapter.generateController('User', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'UserController.php'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'UserService.php'))).toBe(true);
  });

  it('qualityGate() should detect missing composer.json', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('createPhpAdapter factory works', () => {
    expect(createPhpAdapter()).toBeInstanceOf(PhpAdapter);
  });
});
