import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SwiftAdapter, createSwiftAdapter } from '../src/index';

describe('SwiftAdapter', () => {
  let adapter: SwiftAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new SwiftAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'swift-test-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('swift');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect Package.swift', () => {
    fs.writeFileSync(path.join(tmpDir, 'Package.swift'), '// swift-tools-version:5.9');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .swift files', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.swift'), 'import Foundation');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'Package.swift'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'Sources', 'main.swift'))).toBe(true);
  });

  it('generateController() should create .swift files', async () => {
    await adapter.generateController('User', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'UserController.swift'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'UserService.swift'))).toBe(true);
  });

  it('qualityGate() should detect missing Package.swift', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
  });

  it('createSwiftAdapter factory works', () => {
    expect(createSwiftAdapter()).toBeInstanceOf(SwiftAdapter);
  });
});
