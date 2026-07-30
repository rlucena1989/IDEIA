import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readStateFromFile, resolveStatePath, readOrBuildState } from '../state-reader';

const stateFixture = {
  version: '1.0.0',
  lastUpdated: new Date().toISOString(),
  summary: 'test state',
  blocks: [],
  metrics: [],
  artifacts: [],
  commands: [],
  blockers: [],
  nextSteps: [],
};

function makeTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'state-reader-test-'));
}

describe('readStateFromFile', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = makeTempDir();
    fs.writeFileSync(path.join(tmpDir, 'state.json'), JSON.stringify(stateFixture), 'utf8');
  });

  afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should read state from existing file', () => {
    const state = readStateFromFile(path.join(tmpDir, 'state.json'));
    expect(state).not.toBeNull();
    expect(state!.version).toBe('1.0.0');
  });

  it('should return null for non-existent file', () => {
    const state = readStateFromFile(path.join(tmpDir, 'nonexistent.json'));
    expect(state).toBeNull();
  });

  it('should return null for invalid JSON', () => {
    const badFile = path.join(tmpDir, 'bad.json');
    fs.writeFileSync(badFile, 'not json', 'utf8');
    const state = readStateFromFile(badFile);
    expect(state).toBeNull();
  });

  it('should return null for empty file', () => {
    const emptyFile = path.join(tmpDir, 'empty.json');
    fs.writeFileSync(emptyFile, '', 'utf8');
    const state = readStateFromFile(emptyFile);
    expect(state).toBeNull();
  });
});

describe('resolveStatePath', () => {
  let tmpDir: string;

  beforeAll(() => { tmpDir = makeTempDir(); });
  afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should find state.json in root', () => {
    fs.writeFileSync(path.join(tmpDir, 'state.json'), '{}', 'utf8');
    const result = resolveStatePath(tmpDir);
    expect(result).toContain('state.json');
  });

  it('should prefer .ai/state.json over root state.json', () => {
    const aiDir = path.join(tmpDir, '.ai');
    fs.mkdirSync(aiDir, { recursive: true });
    fs.writeFileSync(path.join(aiDir, 'state.json'), '{}', 'utf8');
    const result = resolveStatePath(tmpDir);
    expect(result).toContain('.ai');
    expect(result).toContain('state.json');
  });

  it('should return first candidate if nothing exists', () => {
    const emptyDir = makeTempDir();
    try {
      const result = resolveStatePath(emptyDir);
      expect(result).toContain('.ai');
      expect(result).toContain('state.json');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });

  it('should check governance path', () => {
    const govTmp = makeTempDir();
    try {
      const govDir = path.join(govTmp, 'docs', 'governance');
      fs.mkdirSync(govDir, { recursive: true });
      fs.writeFileSync(path.join(govDir, 'ai-devkit-state.json'), '{}', 'utf8');
      const result = resolveStatePath(govTmp);
      expect(result).toContain('governance');
    } finally {
      fs.rmSync(govTmp, { recursive: true, force: true });
    }
  });
});

describe('readOrBuildState', () => {
  let tmpDir: string;

  beforeAll(() => {
    tmpDir = makeTempDir();
    fs.writeFileSync(path.join(tmpDir, 'state.json'), JSON.stringify(stateFixture), 'utf8');
  });

  afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  it('should read existing state file', () => {
    const result = readOrBuildState(tmpDir);
    expect(result.source.loaded).toBe(true);
    expect(result.source.exists).toBe(true);
    expect(result.state.version).toBe('1.0.0');
  });

  it('should build state when file missing', () => {
    const emptyDir = makeTempDir();
    try {
      const result = readOrBuildState(emptyDir);
      expect(result.source.loaded).toBe(false);
      expect(result.source.exists).toBe(false);
      expect(result.state).toBeDefined();
      expect(typeof result.state.version).toBe('string');
    } finally {
      fs.rmSync(emptyDir, { recursive: true, force: true });
    }
  });
});


