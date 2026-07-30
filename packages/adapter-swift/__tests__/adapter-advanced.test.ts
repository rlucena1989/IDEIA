import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SwiftAdapter, createSwiftAdapter } from '../src/index';

let tmpDir: string;
let adapter: SwiftAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sw-advanced-'));
  adapter = createSwiftAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('SwiftAdapter advanced', () => {
  it('init should accept custom project name and create structure', async () => {
    const result = await adapter.init('MySwiftApp');
    expect(result.success).toBe(true);
    expect(result.files).toContain('MySwiftApp');
  });

  it('detect should return true for Package.swift', () => {
    fs.writeFileSync(path.join(tmpDir, 'Package.swift'), '// swift-tools-version:5.5');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return true for .swift files', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.swift'), 'print("hello")');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect should return false for unrelated files', () => {
    fs.writeFileSync(path.join(tmpDir, 'config.json'), '{}');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('qualityGate should fail on empty directory', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('qualityGate should pass on full swift project', async () => {
    fs.writeFileSync(path.join(tmpDir, 'Package.swift'), '// swift-tools-version:5.5');
    fs.mkdirSync(path.join(tmpDir, 'Sources'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, 'Sources', 'main.swift'), 'print("hello")');
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('generateTemplate should delegate to generateController with unknown type', async () => {
    const dir = await adapter.generateTemplate('UnknownType');
    expect(typeof dir).toBe('string');
  });

  it('generateController should create swift controller file', async () => {
    const dir = await adapter.generateController('Users', tmpDir);
    expect(fs.existsSync(path.join(dir, 'UsersController.swift'))).toBe(true);
  });

  it('createSwiftAdapter factory should create correct instance', () => {
    const instance = createSwiftAdapter();
    expect(instance).toBeInstanceOf(SwiftAdapter);
    expect(instance.name).toBe('swift');
    expect(instance.capabilities).toContain('generateController');
  });

  it('generateTemplate should produce string output', async () => {
    const result = await adapter.generateTemplate('Helper');
    expect(typeof result).toBe('string');
  });

  it('init should handle failure gracefully', async () => {
    const result = await adapter.init('');
    expect(typeof result.success).toBe('boolean');
    expect(Array.isArray(result.files)).toBe(true);
  });
});
