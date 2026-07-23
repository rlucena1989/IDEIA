import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ZigAdapter, createZigAdapter } from '../src/index';

describe('ZigAdapter', () => {
  let adapter: ZigAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new ZigAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zig-test-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('zig');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect build.zig', () => {
    fs.writeFileSync(path.join(tmpDir, 'build.zig'), 'const std = @import("std");');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .zig files', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.zig'), 'const std = @import("std");');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'build.zig'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'src', 'main.zig'))).toBe(true);
  });

  it('generateModule() should create .zig files', async () => {
    await adapter.generateModule('UserModule', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'UserModule.zig'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'UserModule_test.zig'))).toBe(true);
  });

  it('generateTemplate() should delegate correctly', async () => {
    const result = await adapter.generateTemplate('Item');
    expect(typeof result).toBe('string');
  });

  it('qualityGate() should detect missing build.zig', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
  });

  it('createZigAdapter factory works', () => {
    expect(createZigAdapter()).toBeInstanceOf(ZigAdapter);
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
});
