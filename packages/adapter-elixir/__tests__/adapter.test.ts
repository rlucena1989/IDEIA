import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ElixirAdapter, createElixirAdapter } from '../src/index';

describe('ElixirAdapter', () => {
  let adapter: ElixirAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new ElixirAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elixir-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('elixir');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect mix.exs', () => {
    fs.writeFileSync(path.join(tmpDir, 'mix.exs'), 'defmodule Test.MixProject do');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .ex files', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.ex'), 'IO.puts("hello")');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'mix.exs'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'lib'))).toBe(true);
  });

  it('generateModule() should create .ex files', async () => {
    const dir = await adapter.generateModule('users', tmpDir);
    expect(fs.readdirSync(dir).some(f => f.endsWith('.ex'))).toBe(true);
  });

  it('qualityGate() should detect missing mix.exs', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
  });

  it('createElixirAdapter factory works', () => {
    expect(createElixirAdapter()).toBeInstanceOf(ElixirAdapter);
  });
});
