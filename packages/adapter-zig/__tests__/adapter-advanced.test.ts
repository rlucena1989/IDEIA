import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ZigAdapter, createZigAdapter } from '../src/index';

let tmpDir: string;
let adapter: ZigAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'zig-advanced-'));
  adapter = createZigAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ZigAdapter advanced', () => {
  it('init should accept custom project name and create structure', async () => {
    const result = await adapter.init('MyZigApp');
    expect(result.success).toBe(true);
    expect(result.files).toContain('MyZigApp');
  });

  it('detect should return true for build.zig', () => {
    fs.writeFileSync(path.join(tmpDir, 'build.zig'), 'const std = @import("std");');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return true for .zig files', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.zig'), 'export fn main() void {}');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect should return false for unrelated files', () => {
    fs.writeFileSync(path.join(tmpDir, 'readme.md'), '# zig');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('qualityGate should fail on empty directory', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('qualityGate should pass on full zig project', async () => {
    fs.writeFileSync(path.join(tmpDir, 'build.zig'), 'const std = @import("std");');
    fs.mkdirSync(path.join(tmpDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'src', 'main.zig'), 'export fn main() void {}');
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('generateTemplate should delegate to generateModule with unknown type', async () => {
    const dir = await adapter.generateTemplate('UnknownType');
    expect(typeof dir).toBe('string');
  });

  it('generateModule should create .zig file', async () => {
    const dir = await adapter.generateModule('MyModule', tmpDir);
    expect(fs.existsSync(path.join(dir, 'MyModule.zig'))).toBe(true);
  });

  it('createZigAdapter factory should create correct instance', () => {
    const instance = createZigAdapter();
    expect(instance).toBeInstanceOf(ZigAdapter);
    expect(instance.name).toBe('zig');
    expect(instance.capabilities).toContain('generateModule');
  });

  it('generateTemplate should produce string output', async () => {
    const result = await adapter.generateTemplate('Utils');
    expect(typeof result).toBe('string');
  });

  it('init should handle failure gracefully', async () => {
    const result = await adapter.init('');
    expect(typeof result.success).toBe('boolean');
    expect(Array.isArray(result.files)).toBe(true);
  });
});
