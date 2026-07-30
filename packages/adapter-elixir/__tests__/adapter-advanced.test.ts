import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ElixirAdapter, createElixirAdapter } from '../src/index';

let tmpDir: string;
let adapter: ElixirAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'elixir-advanced-'));
  adapter = createElixirAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('ElixirAdapter advanced', () => {
  it('init() with custom project name should scaffold under that name', async () => {
    const result = await adapter.init(path.join(tmpDir, 'my_elixir_app'));
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_elixir_app', 'mix.exs'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'my_elixir_app', 'lib'))).toBe(true);
  });

  it('detect() should return false when marker file is in subdirectory but not root', () => {
    fs.mkdirSync(path.join(tmpDir, 'sub'));
    fs.writeFileSync(path.join(tmpDir, 'sub', 'mix.exs'), 'defmodule Sub.MixProject do');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect() should return false when wrong marker file exists', () => {
    fs.writeFileSync(path.join(tmpDir, 'package.json'), '{"name":"test"}');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('generateModule() should work incrementatively with multiple modules', async () => {
    await adapter.init(tmpDir);
    await adapter.generateModule('Users', path.join(tmpDir, 'lib', 'users'));
    await adapter.generateModule('Posts', path.join(tmpDir, 'lib', 'posts'));
    expect(fs.readdirSync(path.join(tmpDir, 'lib', 'users')).some(f => f.endsWith('.ex'))).toBe(true);
    expect(fs.readdirSync(path.join(tmpDir, 'lib', 'posts')).some(f => f.endsWith('.ex'))).toBe(true);
  });

  it('qualityGate() should fail on partially complete project', async () => {
    fs.mkdirSync(path.join(tmpDir, 'lib'));
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.issues).toContain('mix.exs not found');
  });

  it('generateTemplate() with unknown type should still return a string', async () => {
    const result = await adapter.generateTemplate('__unknown__');
    expect(typeof result).toBe('string');
  });

  it('factory function should return correct adapter type', () => {
    const instance = createElixirAdapter();
    expect(instance).toBeInstanceOf(ElixirAdapter);
    expect(instance.name).toBe('elixir');
  });
});
