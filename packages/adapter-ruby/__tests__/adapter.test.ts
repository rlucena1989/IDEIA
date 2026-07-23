import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { RubyAdapter, createRubyAdapter } from '../src/index';

describe('RubyAdapter', () => {
  let adapter: RubyAdapter;
  let tmpDir: string;

  beforeEach(() => {
    adapter = new RubyAdapter();
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ruby-test-'));
  });

  afterEach(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should have name and capabilities', () => {
    expect(adapter.name).toBe('ruby');
    expect(adapter.capabilities).toContain('detect');
  });

  it('detect() should detect Gemfile', () => {
    fs.writeFileSync(path.join(tmpDir, 'Gemfile'), 'source "https://rubygems.org"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should detect .rb files', () => {
    fs.writeFileSync(path.join(tmpDir, 'main.rb'), 'puts "hello"');
    expect(adapter.detect(tmpDir)).toBe(true);
  });

  it('detect() should return false for empty dir', () => {
    expect(adapter.detect(tmpDir)).toBe(false);
  });

  it('init() should scaffold project', async () => {
    const result = await adapter.init(tmpDir);
    expect(result.success).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'Gemfile'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'app.rb'))).toBe(true);
  });

  it('generateController() should create .rb files', async () => {
    await adapter.generateController('User', tmpDir);
    expect(fs.existsSync(path.join(tmpDir, 'user_controller.rb'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'user_service.rb'))).toBe(true);
  });

  it('qualityGate() should detect missing Gemfile', async () => {
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(false);
  });

  it('qualityGate() should pass with proper structure', async () => {
    await adapter.init(tmpDir);
    const result = await adapter.qualityGate(tmpDir);
    expect(result.passed).toBe(true);
  });

  it('createRubyAdapter factory works', () => {
    expect(createRubyAdapter()).toBeInstanceOf(RubyAdapter);
  });
});
