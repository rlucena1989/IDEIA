import { detectStack, saveStack, StackInfo } from '../commands/detect';
import { getIO, resetIO } from '../io';
import path from 'node:path';

jest.mock('../io', () => {
  const { MockIOContainer } = jest.requireActual('../io/mock');
  let mockIO: any = null;
  return {
    __esModule: true,
    getIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
    resetIO: () => { mockIO = null; },
    createIO: () => {
      if (!mockIO) mockIO = new MockIOContainer();
      return mockIO;
    },
  };
});

describe('detect - detectStack', () => {
  let io: any;

  beforeEach(() => {
    resetIO();
    io = getIO() as any;
    io._reset();
  });

  function add(file: string) {
    io.fs._addFile(path.resolve('/proj', file));
  }

  it('deve retornar stack vazia para diretorio sem arquivos conhecidos', () => {
    const info = detectStack('/empty');
    expect(info.languages).toEqual([]);
    expect(info.frameworks).toEqual([]);
    expect(info.packageManager).toBeNull();
  });

  it('deve detectar typescript (tsconfig.json)', () => {
    add('tsconfig.json');
    const info = detectStack('/proj');
    expect(info.languages).toContain('typescript');
  });

  it('deve detectar javascript (package.json)', () => {
    add('package.json');
    const info = detectStack('/proj');
    expect(info.languages).toContain('javascript');
  });

  it('deve detectar go (go.mod)', () => {
    add('go.mod');
    const info = detectStack('/proj');
    expect(info.languages).toContain('go');
  });

  it('deve detectar rust (Cargo.toml)', () => {
    add('Cargo.toml');
    const info = detectStack('/proj');
    expect(info.languages).toContain('rust');
  });

  it('deve detectar python (requirements.txt)', () => {
    add('requirements.txt');
    const info = detectStack('/proj');
    expect(info.languages).toContain('python');
  });

  it('deve detectar npm como package manager', () => {
    add('package-lock.json');
    const info = detectStack('/proj');
    expect(info.packageManager).toBe('npm');
  });

  it('deve detectar pnpm como package manager', () => {
    add('pnpm-lock.yaml');
    const info = detectStack('/proj');
    expect(info.packageManager).toBe('pnpm');
  });

  it('saveStack deve escrever arquivo stack.json', () => {
    const info: StackInfo = {
      languages: ['typescript'],
      frameworks: ['express'],
      packageManager: 'npm',
      ciProviders: [],
      buildTool: 'typescript',
      testFramework: 'jest',
    };
    saveStack('/proj', info);
    const stackPath = path.resolve('/proj/.ai/stack.json');
    expect(io.fs.exists(stackPath)).toBe(true);
    const content = JSON.parse(io.fs.read(stackPath, 'utf8'));
    expect(content.languages).toContain('typescript');
    expect(content.frameworks).toContain('express');
  });
});