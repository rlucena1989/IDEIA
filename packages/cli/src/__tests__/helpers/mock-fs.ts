import path from 'node:path';
import { createLogger } from '@ideia/logger';
const logger = createLogger('mock-fs');

interface MockFS {
  _reset(): void;
  _addFile(filePath: string, content?: string): void;
  _addDir(dirPath: string): void;
  _getFiles(): string[];
}

let mockFS: MockFS | null = null;

export function useMockFS(): MockFS {
  jest.mock('node:fs');
  jest.mock('fs');
  mockFS = require('fs') as MockFS;
  mockFS._reset();
  return mockFS;
}

export function getMockFS(): MockFS {
  if (!mockFS) throw new Error('Call useMockFS() first');
  return mockFS;
}

export function setupProjectDir(basePath: string): MockFS {
  const fs = useMockFS();
  fs._addFile(path.join(basePath, 'package.json'), JSON.stringify({ name: 'test', version: '1.0.0' }));
  fs._addFile(path.join(basePath, 'tsconfig.json'), '{}');
  fs._addDir(path.join(basePath, '.ai'));
  fs._addFile(path.join(basePath, '.ai', 'laws.yaml'), 'rules: []');
  fs._addFile(path.join(basePath, '.ai', 'project-manifest.yaml'), 'project: { name: "test" }');
  fs._addFile(path.join(basePath, '.ai', 'context', 'ai-handoff.md'), '# Handoff');
  fs._addFile(path.join(basePath, 'README.md'), '# Test');
  fs._addFile(path.join(basePath, '.gitignore'), 'node_modules');
  fs._addDir(path.join(basePath, 'node_modules'));
  return fs;
}

export function setupMockSpawn() {
  jest.mock('node:child_process');
  const cp = require('child_process');
  cp._reset();
  cp._setDefault({ status: 0, stdout: 'mocked' });
  return cp;
}
