import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { HaskellAdapter, createHaskellAdapter } from '../src/index';

describe('HaskellAdapter', () => {
  let adapter: HaskellAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new HaskellAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hs-test-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('haskell');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect stack.yaml', () => {
    fs.writeFileSync(path.join(tmpDir, 'stack.yaml'), 'resolver: lts-22');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .hs files', () => {
    fs.writeFileSync(path.join(tmpDir, 'Main.hs'), 'module Main where');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .cabal files', () => {
    fs.writeFileSync(path.join(tmpDir, 'test.cabal'), 'name: test');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
  });

  it('generateModule() should create .hs files', async () => {
    const dir = await adapter.generateModule('TestModule', tmpDir);
    expect(fs.existsSync(path.join(dir, 'TestModule.hs'))).toBe(true);
  });

  it('qualityGate() should detect missing structure', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result).toHaveProperty('passed');
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('issues');
  });

  it('createHaskellAdapter factory works', () => {
    expect(createHaskellAdapter()).toBeInstanceOf(HaskellAdapter);
  });

  it('generateTemplate delegates correctly', async () => {
    const result = await adapter.generateTemplate('App');
    expect(typeof result).toBe('string');
  });
});
