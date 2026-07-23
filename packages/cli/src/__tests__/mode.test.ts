import { getMode, setMode, ModeConfig, VALID_MODES, type SessionMode } from '../commands/mode';
import { getIO, resetIO } from '../io';
import type { MockIOContainer } from '../io/mock';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

jest.mock('../io', () => {
  const { MockIOContainer } = jest.requireActual('../io/mock');
  let mockIO: MockIOContainer | null = null;
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

describe('mode', () => {
  let io: MockIOContainer;

  beforeEach(() => {
    resetIO();
    io = getIO() as unknown as MockIOContainer;
    io._reset();
    io.setupProject();
  });

  it('VALID_MODES deve conter modos esperados', () => {
    expect(VALID_MODES).toContain('development');
    expect(VALID_MODES).toContain('security');
    expect(VALID_MODES).toContain('performance');
    expect(VALID_MODES).toContain('migration');
    expect(VALID_MODES).toContain('debugging');
    expect(VALID_MODES).toContain('documentation');
  });

  it('getMode deve retornar DEFAULT_MODE quando arquivo nao existe', () => {
    const mode = getMode('/nonexistent_dir_for_test');
    expect(mode.mode).toBe('development');
    expect(mode.updatedAt).toBeTruthy();
  });

  it('getMode deve retornar DEFAULT_MODE para modo invalido no JSON', () => {
    const root = os.tmpdir();
    const modePath = path.join(root, '.ai', 'session-mode.json');
    io.fs._addFile(modePath, JSON.stringify({ mode: 'invalid_mode', updatedAt: '2026-01-01T00:00:00.000Z' }));
    const mode = getMode(root);
    expect(mode.mode).toBe('development');
  });

  it('getMode deve retornar DEFAULT_MODE para JSON malformado', () => {
    const root = os.tmpdir();
    const modePath = path.join(root, '.ai', 'session-mode.json');
    io.fs._addFile(modePath, 'not json');
    const mode = getMode(root);
    expect(mode.mode).toBe('development');
  });

  it('getMode deve retornar modo salvo quando arquivo existe', () => {
    const root = os.tmpdir();
    const modePath = path.join(root, '.ai', 'session-mode.json');
    io.fs._addFile(modePath, JSON.stringify({ mode: 'security', updatedAt: '2026-01-01T00:00:00.000Z' } as ModeConfig));
    const mode = getMode(root);
    expect(mode.mode).toBe('security');
  });

  it('setMode deve escrever arquivo com modo correto', () => {
    const root = os.tmpdir();
    setMode(root, 'debugging');
    const modePath = path.join(root, '.ai', 'session-mode.json');
    expect(io.fs.exists(modePath)).toBe(true);
    const content = JSON.parse(io.fs.read(modePath, 'utf8'));
    expect(content.mode).toBe('debugging');
  });

  it('setMode e getMode devem ser consistentes', () => {
    const root = os.tmpdir();
    setMode(root, 'performance');
    const mode = getMode(root);
    expect(mode.mode).toBe('performance');
  });

  it('setMode deve atualizar updatedAt para timestamp ISO', () => {
    const root = os.tmpdir();
    setMode(root, 'security');
    const modePath = path.join(root, '.ai', 'session-mode.json');
    const content = JSON.parse(io.fs.read(modePath, 'utf8'));
    expect(content.updatedAt).toBeTruthy();
    expect(new Date(content.updatedAt).getTime()).not.toBeNaN();
  });

  it('VALID_MODES deve conter todos os 6 modos validos', () => {
    expect(VALID_MODES.length).toBe(6);
    expect(VALID_MODES.every(m => typeof m === 'string')).toBe(true);
  });

  it('VALID_MODES nao deve conter modo invalido', () => {
    expect(VALID_MODES).not.toContain('invalid_mode');
    expect(VALID_MODES).not.toContain('');
  });

  it('getMode deve retornar updatedAt mesmo sem arquivo', () => {
    const mode = getMode('/nonexistent_dir_for_test');
    expect(mode.updatedAt).toBeTruthy();
    expect(typeof mode.updatedAt).toBe('string');
  });

  it('round trip todos os modos validos via setMode/getMode', () => {
    const root = os.tmpdir();
    for (const m of VALID_MODES) {
      setMode(root, m as SessionMode);
      const mode = getMode(root);
      expect(mode.mode).toBe(m);
    }
  });

  it('getMode retorna development para JSON com timestamp mas sem campo mode', () => {
    const root = os.tmpdir();
    const modePath = path.join(root, '.ai', 'session-mode.json');
    io.fs._addFile(modePath, JSON.stringify({ updatedAt: '2026-01-01T00:00:00.000Z' }));
    const mode = getMode(root);
    expect(mode.mode).toBe('development');
  });

  it('setMode cria diretorio .ai automaticamente', () => {
    const root = path.join(os.tmpdir(), `mode-dir-${Date.now()}`);
    fs.mkdirSync(root, { recursive: true });
    setMode(root, 'documentation');
    const modePath = path.join(root, '.ai', 'session-mode.json');
    expect(io.fs.exists(modePath)).toBe(true);
  });
});