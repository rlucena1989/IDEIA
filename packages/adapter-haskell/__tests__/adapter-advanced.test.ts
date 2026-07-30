import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HaskellAdapter, createHaskellAdapter } from '../src/index';

let tmpDir: string;
let adapter: HaskellAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-advanced-'));
  adapter = createHaskellAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('HaskellAdapter advanced', () => {
  it('init should accept custom project name and create structure', async () => {
    const result = await adapter.init('MyHaskellApp');
    expect(result.success).toBe(true);
    expect(result.files).toContain('MyHaskellApp');
  });

  it('detect should return true for stack.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'stack.yaml'), 'resolver: lts-22');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return true for .hs files', () => {
    fs.writeFileSync(path.join(tmpDir, 'Main.hs'), 'module Main where');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect should return false for unrelated files', () => {
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# unrelated');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('qualityGate should fail on empty directory', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('qualityGate should pass on full haskell project', async () => {
    fs.writeFileSync(path.join(tmpDir, 'stack.yaml'), 'resolver: lts-22');
    fs.writeFileSync(path.join(tmpDir, 'Main.hs'), 'module Main where');
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('generateTemplate should delegate to generateModule with unknown type', async () => {
    const dir = await adapter.generateTemplate('UnknownType');
    expect(typeof dir).toBe('string');
  });

  it('generateModule should create .hs file', async () => {
    const dir = await adapter.generateModule('MyModule', tmpDir);
    expect(fs.existsSync(path.join(dir, 'MyModule.hs'))).toBe(true);
  });

  it('createHaskellAdapter factory should create correct instance', () => {
    const instance = createHaskellAdapter();
    expect(instance).toBeInstanceOf(HaskellAdapter);
    expect(instance.name).toBe('haskell');
    expect(instance.capabilities).toContain('generateModule');
  });

  it('generateTemplate should produce string output', async () => {
    const result = await adapter.generateTemplate('Controller');
    expect(typeof result).toBe('string');
  });

  it('init should handle failure gracefully', async () => {
    const result = await adapter.init('');
    expect(typeof result.success).toBe('boolean');
    expect(Array.isArray(result.files)).toBe(true);
  });
});
