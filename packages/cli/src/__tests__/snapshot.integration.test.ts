import { getHealthScore, detectStack, fileExists, countFiles, countLines, generateSnapshot, snapshotCommand } from '../commands/snapshot';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';

let tmpDir: string;

beforeEach(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snapshot-')); jest.spyOn(process, 'cwd').mockReturnValue(tmpDir as string & (() => string)); });
afterEach(() => { jest.restoreAllMocks(); try { if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {} });

function createFile(filePath: string, content: string): void {
  const full = path.join(tmpDir, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content, 'utf8');
}

describe('detectStack', () => {
  it('detects javascript from package.json', () => { createFile('package.json', '{}'); expect(detectStack(tmpDir).languages).toContain('javascript'); });
  it('detects python from requirements.txt', () => { createFile('requirements.txt', 'fastapi\nuvicorn'); expect(detectStack(tmpDir).languages).toContain('python'); });
  it('detects go from go.mod', () => { createFile('go.mod', 'module test'); expect(detectStack(tmpDir).languages).toContain('go'); });
  it('detects nextjs and react', () => { createFile('package.json', JSON.stringify({ dependencies: { next: '13', react: '18' } })); const r = detectStack(tmpDir); expect(r.frameworks).toContain('nextjs'); expect(r.frameworks).toContain('react'); });
  it('detects nestjs', () => { createFile('package.json', JSON.stringify({ dependencies: { '@nestjs/core': '10' } })); expect(detectStack(tmpDir).frameworks).toContain('nestjs'); });
  it('returns empty for empty dir', () => { const r = detectStack(tmpDir); expect(r.languages).toEqual([]); expect(r.frameworks).toEqual([]); });
  it('detects python via pyproject.toml with fastapi', () => { createFile('pyproject.toml', '\nfastapi\n'); createFile('requirements.txt', ''); const r = detectStack(tmpDir); expect(r.languages).toContain('python'); });
});

describe('getHealthScore', () => {
  it('healthy for complete project', () => {
    createFile('package.json', '{}'); createFile('tsconfig.json', '{}'); createFile('README.md', '# t'); createFile('.gitignore', 'd'); createFile('src/index.ts', '');
    fs.mkdirSync(path.join(tmpDir, '.ai'), { recursive: true }); createFile('.ai/laws.yaml', 'rules: []');
    expect(getHealthScore(tmpDir).score).toBeGreaterThanOrEqual(85);
  });
  it('low score for minimal', () => { createFile('src/index.ts', ''); expect(getHealthScore(tmpDir).score).toBeLessThan(50); });
  it('counts passed and failed', () => { createFile('package.json', '{}'); const r = getHealthScore(tmpDir); expect(r.passed + r.failed).toBe(r.checks); });
});

describe('fileExists', () => {
  it('true for existing', () => { createFile('test.txt', 'h'); expect(fileExists(tmpDir, 'test.txt')).toBe(true); });
  it('false for missing', () => { expect(fileExists(tmpDir, 'nope')).toBe(false); });
  it('nested paths', () => { createFile('a/b/c.txt', 'n'); expect(fileExists(tmpDir, 'a', 'b', 'c.txt')).toBe(true); });
});

describe('countFiles', () => {
  it('counts files', () => { createFile('a/1.yaml', 'a'); createFile('a/2.yaml', 'b'); createFile('a/3.txt', 'c'); expect(countFiles(path.join(tmpDir, 'a'))).toBe(3); });
  it('filters by pattern', () => { createFile('a/1.yaml', 'a'); createFile('a/3.txt', 'c'); expect(countFiles(path.join(tmpDir, 'a'), /\.yaml$/)).toBe(1); });
  it('returns 0 for missing dir', () => { expect(countFiles(path.join(tmpDir, 'nonexistent'))).toBe(0); });
});

describe('countLines', () => {
  it('counts non-empty', () => { createFile('f.txt', 'a\nb\n\nc\n'); expect(countLines(path.join(tmpDir, 'f.txt'))).toBe(3); });
  it('returns 0 for missing', () => { expect(countLines(path.join(tmpDir, 'm.txt'))).toBe(0); });
  it('returns 0 for empty', () => { createFile('e.txt', ''); expect(countLines(path.join(tmpDir, 'e.txt'))).toBe(0); });
});

describe('generateSnapshot', () => {
  it('generates snapshot for minimal project', () => { createFile('package.json', JSON.stringify({ name: 't', version: '1.0.0' })); const snap = generateSnapshot(tmpDir); expect(snap.project.version).toBe('1.0.0'); expect(snap.health.score).toBeGreaterThanOrEqual(0); });
  it('detects javascript stack', () => { createFile('package.json', '{}'); expect(generateSnapshot(tmpDir).project.stack).toContain('javascript'); });
  it('returns 0 policies when no .ai/policies', () => { createFile('package.json', '{}'); expect(generateSnapshot(tmpDir).governance.policies_count).toBe(0); });
  it('returns 0 tasks when no .ai/tasks', () => { createFile('package.json', '{}'); expect(generateSnapshot(tmpDir).tasks.total).toBe(0); });
});

describe('snapshotCommand', () => {
  it('creates command with generate and status subcommands', () => {
    const cmd = snapshotCommand();
    expect(cmd.commands.some(c => c.name() === 'generate')).toBe(true);
    expect(cmd.commands.some(c => c.name() === 'status')).toBe(true);
  });

  it('generate action calls finish', () => {
    jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit_called'); });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    createFile('package.json', JSON.stringify({ name: 'x' }));
    const cmd = snapshotCommand();
    const generate = cmd.commands.find(c => c.name() === 'generate')!;
    try { generate.parse(['generate'], { from: 'user' }); } catch {}
    expect(process.exit).toHaveBeenCalled();
  });

  it('status action calls finish', () => {
    jest.spyOn(process, 'exit').mockImplementation(() => { throw new Error('exit_called'); });
    jest.spyOn(console, 'log').mockImplementation(() => {});
    createFile('package.json', JSON.stringify({ name: 'x' }));
    const cmd = snapshotCommand();
    const status = cmd.commands.find(c => c.name() === 'status')!;
    try { status.parse(['status'], { from: 'user' }); } catch {}
    expect(process.exit).toHaveBeenCalled();
  });
});
