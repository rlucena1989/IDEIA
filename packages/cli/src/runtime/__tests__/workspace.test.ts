import { describe, it, expect, afterAll, beforeAll } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { planShards, getShardSummary, isMonoRepo, detectPackageManager } from '../workspace';

let tmpDir: string;

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-test-'));
  fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'export const x = 1;', 'utf8');
  fs.mkdirSync(path.join(tmpDir, 'packages', 'pkg1'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'packages', 'pkg1', 'package.json'), JSON.stringify({ name: '@test/pkg1' }), 'utf8');
  fs.writeFileSync(path.join(tmpDir, 'packages', 'pkg1', 'index.ts'), 'export function foo() {}', 'utf8');
  fs.mkdirSync(path.join(tmpDir, 'packages', 'pkg2'), { recursive: true });
  fs.writeFileSync(path.join(tmpDir, 'packages', 'pkg2', 'index.ts'), 'export function bar() {}', 'utf8');
});

afterAll(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe('planShards', () => {
  it('should create shards for workspace files', () => {
    const plan = planShards(tmpDir, 8000);
    expect(plan.shards.length).toBeGreaterThanOrEqual(2);
    expect(plan.totalFiles).toBeGreaterThan(0);
  });

  it('should include symbol counts in shards', () => {
    const plan = planShards(tmpDir, 8000);
    for (const shard of plan.shards) {
      expect(shard).toHaveProperty('symbolCount');
      expect(typeof shard.symbolCount).toBe('number');
    }
  });

  it('should have unique shard IDs', () => {
    const plan = planShards(tmpDir, 8000);
    const ids = plan.shards.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should estimate tokens', () => {
    const plan = planShards(tmpDir, 8000);
    for (const shard of plan.shards) {
      expect(typeof shard.estimatedTokens).toBe('number');
      expect(shard.estimatedTokens).toBeGreaterThanOrEqual(0);
    }
  });
});

describe('getShardSummary', () => {
  it('should produce formatted summary string', () => {
    const plan = planShards(tmpDir, 8000);
    const summary = getShardSummary(plan);
    expect(summary).toContain('Workspace Shards:');
    expect(summary).toContain('Total files:');
    expect(summary).toContain('Total symbols:');
  });

  it('should include shard details', () => {
    const plan = planShards(tmpDir, 8000);
    const summary = getShardSummary(plan);
    for (const shard of plan.shards) {
      expect(summary).toContain(shard.id);
    }
  });
});

describe('isMonoRepo', () => {
  it('should detect monorepo with packages dir', () => {
    expect(isMonoRepo(tmpDir)).toBe(true);
  });

  it('should return false for non-monorepo', () => {
    const nonMono = fs.mkdtempSync(path.join(os.tmpdir(), 'non-mono-'));
    try {
      expect(isMonoRepo(nonMono)).toBe(false);
    } finally {
      fs.rmSync(nonMono, { recursive: true, force: true });
    }
  });

  it('should detect monorepo with lerna.json', () => {
    const lernaDir = fs.mkdtempSync(path.join(os.tmpdir(), 'lerna-'));
    try {
      fs.writeFileSync(path.join(lernaDir, 'lerna.json'), '{}');
      expect(isMonoRepo(lernaDir)).toBe(true);
    } finally {
      fs.rmSync(lernaDir, { recursive: true, force: true });
    }
  });
});

describe('detectPackageManager', () => {
  it('should detect pnpm', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
    try {
      fs.writeFileSync(path.join(dir, 'pnpm-lock.yaml'), '');
      expect(detectPackageManager(dir)).toBe('pnpm');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should detect yarn', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
    try {
      fs.writeFileSync(path.join(dir, 'yarn.lock'), '');
      expect(detectPackageManager(dir)).toBe('yarn');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should detect npm', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
    try {
      fs.writeFileSync(path.join(dir, 'package-lock.json'), '');
      expect(detectPackageManager(dir)).toBe('npm');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should detect nx', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
    try {
      fs.writeFileSync(path.join(dir, 'nx.json'), '');
      expect(detectPackageManager(dir)).toBe('nx');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it('should return unknown when no lock file', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'pm-'));
    try {
      expect(detectPackageManager(dir)).toBe('unknown');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
