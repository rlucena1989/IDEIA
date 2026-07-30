import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RubyAdapter, createRubyAdapter } from '../src/index';

let tmpDir: string;
let adapter: RubyAdapter;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rb-advanced-'));
  adapter = createRubyAdapter();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('RubyAdapter advanced', () => {
  it('init should accept custom project name and create structure', async () => {
    const result = await adapter.init('MyRubyApp');
    expect(result.success).toBe(true);
    expect(result.files).toContain('MyRubyApp');
  });

  it('detect should return true for Gemfile', () => {
    fs.writeFileSync(path.join(tmpDir, 'Gemfile'), 'source "https://rubygems.org"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return true for .rb files', () => {
    fs.writeFileSync(path.join(tmpDir, 'app.rb'), 'puts "hello"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect should return false for empty directory', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('detect should return false for unrelated files', () => {
    fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'some text');
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('qualityGate should fail on empty directory', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
    expect(result.issues.length).toBeGreaterThan(0);
  });

  it('qualityGate should pass on full ruby project', async () => {
    fs.writeFileSync(path.join(tmpDir, 'Gemfile'), 'source "https://rubygems.org"');
    fs.writeFileSync(path.join(tmpDir, 'app.rb'), 'puts "hello"');
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(result.issues).toHaveLength(0);
  });

  it('generateTemplate should delegate to generateController with unknown type', async () => {
    const dir = await adapter.generateTemplate('UnknownType');
    expect(typeof dir).toBe('string');
  });

  it('generateController should create controller file', async () => {
    const dir = await adapter.generateController('users', tmpDir);
    expect(fs.existsSync(path.join(dir, 'users_controller.rb'))).toBe(true);
  });

  it('createRubyAdapter factory should create correct instance', () => {
    const instance = createRubyAdapter();
    expect(instance).toBeInstanceOf(RubyAdapter);
    expect(instance.name).toBe('ruby');
    expect(instance.capabilities).toContain('generateController');
  });

  it('generateTemplate should produce string output', async () => {
    const result = await adapter.generateTemplate('API');
    expect(typeof result).toBe('string');
  });

  it('init should handle failure gracefully', async () => {
    const result = await adapter.init('');
    expect(typeof result.success).toBe('boolean');
    expect(Array.isArray(result.files)).toBe(true);
  });
});
