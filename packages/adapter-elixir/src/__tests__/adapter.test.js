const path = require('path');
const fs = require('fs');
const os = require('os');
const {
  name, capabilities, detect, init, generateTemplate,
  runLint, runTests, runBuild, qualityGate
} = require('../../index');

describe('adapter-elixir', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'adapter-elixir-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should export correct name', () => {
    expect(name).toBe('elixir');
  });

  it('should have all required capabilities', () => {
    expect(capabilities).toContain('detect');
    expect(capabilities).toContain('init');
    expect(capabilities).toContain('generateTemplate');
    expect(capabilities).toContain('runLint');
    expect(capabilities).toContain('runTests');
    expect(capabilities).toContain('runBuild');
    expect(capabilities).toContain('qualityGate');
  });

  it('should detect project with marker file', () => {
    fs.writeFileSync(path.join(tmpDir, 'mix.exs'), '');
    expect(detect(tmpDir)).toBe(true);
  });

  it('should not detect project without marker file', () => {
    expect(detect(tmpDir)).toBe(false);
  });

  it('should not detect non-existent path', () => {
    expect(detect(path.join(os.tmpdir(), 'non-existent-elixir-999'))).toBe(false);
  });

  it('should generate template structure', () => {
    const result = generateTemplate('testpkg');
    expect(typeof result).toBe('string');
    expect(result.length).toBeGreaterThan(0);
    expect(fs.existsSync(result)).toBe(true);
    if (fs.existsSync(result)) {
      fs.rmSync(result, { recursive: true, force: true });
    }
  });

  it('should export all expected functions', () => {
    expect(typeof detect).toBe('function');
    expect(typeof init).toBe('function');
    expect(typeof generateTemplate).toBe('function');
    expect(typeof runLint).toBe('function');
    expect(typeof runTests).toBe('function');
    expect(typeof runBuild).toBe('function');
    expect(typeof qualityGate).toBe('function');
  });
});
