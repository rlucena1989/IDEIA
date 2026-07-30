import { Command } from 'commander';
import path from 'node:path';
import { detectCommand, detectStack, saveStack, type StackInfo } from '../detect';
import { getIO, resetIO, MockIOContainer } from '../../io';

const OGTI = process.env.GTI_TEST_MODE;

beforeEach(() => {
  process.env.GTI_TEST_MODE = '1';
  resetIO();
  const io = getIO() as MockIOContainer;
  io._reset();
});
afterEach(() => {
  process.env.GTI_TEST_MODE = OGTI;
});

describe('detectCommand', () => {
  it('returns a Commander Command with name detect', () => {
    const cmd = detectCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('detect');
  });

  it('has description', () => {
    const cmd = detectCommand();
    expect(cmd.description()).toBeTruthy();
  });

  it('has subcommand stack', () => {
    const cmd = detectCommand();
    const stackCmd = cmd.commands.find(c => c.name() === 'stack');
    expect(stackCmd).toBeDefined();
    expect(stackCmd!.description()).toBeTruthy();
  });

  it('has subcommand list-languages', () => {
    const cmd = detectCommand();
    const listCmd = cmd.commands.find(c => c.name() === 'list-languages');
    expect(listCmd).toBeDefined();
    expect(listCmd!.description()).toBeTruthy();
  });
});

describe('detectStack', () => {
  it('returns a StackInfo with expected properties', () => {
    const info = detectStack();
    expect(info).toHaveProperty('languages');
    expect(info).toHaveProperty('frameworks');
    expect(info).toHaveProperty('packageManager');
    expect(info).toHaveProperty('ciProviders');
    expect(info).toHaveProperty('buildTool');
    expect(info).toHaveProperty('testFramework');
    expect(Array.isArray(info.languages)).toBe(true);
    expect(Array.isArray(info.frameworks)).toBe(true);
    expect(Array.isArray(info.ciProviders)).toBe(true);
  });

  it('detects TypeScript when tsconfig.json exists', () => {
    const root = process.cwd();
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'tsconfig.json'), '{}');
    const info = detectStack(root);
    expect(info.languages).toContain('typescript');
  });

  it('returns empty result when no known files exist', () => {
    const root = path.join(process.cwd(), 'empty-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    const info = detectStack(root);
    expect(info.languages).toHaveLength(0);
    expect(info.frameworks).toHaveLength(0);
    expect(info.packageManager).toBeNull();
    expect(info.buildTool).toBeNull();
    expect(info.testFramework).toBeNull();
    expect(info.ciProviders).toHaveLength(0);
  });

  it('detects JavaScript from package.json', () => {
    const root = path.join(process.cwd(), 'js-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'package.json'), '{}');
    const info = detectStack(root);
    expect(info.languages).toContain('javascript');
  });

  it('detects npm package manager', () => {
    const root = path.join(process.cwd(), 'npm-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'package.json'), '{}');
    io.fs._addFile(path.join(root, 'package-lock.json'), '');
    const info = detectStack(root);
    expect(info.packageManager).toBe('npm');
  });

  it('detects frameworks from package.json', () => {
    const root = path.join(process.cwd(), 'framework-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'package.json'),
      JSON.stringify({ dependencies: { express: '^4.0.0', react: '^18.0.0' } }));
    const info = detectStack(root);
    expect(info.frameworks).toContain('express');
    expect(info.frameworks).toContain('react');
  });

  it('detects test framework from package.json', () => {
    const root = path.join(process.cwd(), 'test-fw-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'package.json'),
      JSON.stringify({ devDependencies: { jest: '^29.0.0' } }));
    const info = detectStack(root);
    expect(info.testFramework).toBe('jest');
  });

  it('detects CI providers from directory/file presence', () => {
    const root = path.join(process.cwd(), 'ci-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'package.json'), '{}');
    io.fs._addDir(path.join(root, '.github', 'workflows'));
    const info = detectStack(root);
    expect(info.ciProviders).toContain('github-actions');
  });

  it('detects build tool from tsconfig', () => {
    const root = path.join(process.cwd(), 'build-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'tsconfig.json'), '{}');
    const info = detectStack(root);
    expect(info.buildTool).toBe('typescript');
  });

  it('detects C language from .c files via glob', () => {
    const root = path.join(process.cwd(), 'c-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    io.fs._addFile(path.join(root, 'main.c'), 'int main() {}');
    const info = detectStack(root);
    expect(info.languages).toContain('c');
  });

  it('uses current directory when root is omitted', () => {
    const info = detectStack();
    expect(info).toBeDefined();
    expect(Array.isArray(info.languages)).toBe(true);
  });
});

describe('saveStack', () => {
  it('writes stack info to .ai/stack.json', () => {
    const root = path.join(process.cwd(), 'save-project');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    const info: StackInfo = {
      languages: ['typescript', 'javascript'],
      frameworks: ['react'],
      packageManager: 'npm',
      ciProviders: ['github-actions'],
      buildTool: 'typescript',
      testFramework: 'jest',
    };
    saveStack(root, info);
    const stackPath = path.join(root, '.ai', 'stack.json');
    expect(io.fs.exists(stackPath)).toBe(true);
    const content = JSON.parse(io.fs.read(stackPath));
    expect(content.languages).toEqual(['typescript', 'javascript']);
    expect(content.frameworks).toEqual(['react']);
    expect(content.packageManager).toBe('npm');
    expect(content.ciProviders).toEqual(['github-actions']);
    expect(content.buildTool).toBe('typescript');
    expect(content.testFramework).toBe('jest');
    expect(content.detectedAt).toBeDefined();
  });

  it('creates .ai directory if missing', () => {
    const root = path.join(process.cwd(), 'no-ai-dir');
    const io = getIO() as MockIOContainer;
    io.fs._addDir(root);
    const info: StackInfo = {
      languages: [], frameworks: [], packageManager: null,
      ciProviders: [], buildTool: null, testFramework: null,
    };
    saveStack(root, info);
    expect(io.fs.exists(path.join(root, '.ai', 'stack.json'))).toBe(true);
  });
});
