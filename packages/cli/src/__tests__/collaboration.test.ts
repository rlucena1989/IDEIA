import { saveSession, loadSession, listSessions, CollaborationSession } from '../local-ai/collaboration';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('collaboration', () => {
  let tmpDir: string;

  beforeAll(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'collab-test-')); });
  afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  const makeSession = (id: string): CollaborationSession => ({
    id, task: 'Fix bug', status: 'planning', agents: ['planner'],
    messages: [{ id: 'm1', from: 'system', to: 'planner', type: 'delegation', subject: 'plan', body: 'analyze', contextFiles: [], timestamp: new Date().toISOString() }],
    createdAt: new Date().toISOString(),
  });

  describe('saveSession', () => {
    it('deve salvar sessao em arquivo JSON', () => {
      const session = makeSession('test-save-1');
      saveSession(tmpDir, session);
      const filePath = path.join(tmpDir, '.ai', 'reports', 'collaboration', 'test-save-1.json');
      expect(fs.existsSync(filePath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      expect(saved.id).toBe('test-save-1');
    });

    it('deve adicionar ID ao indice', () => {
      const session = makeSession('test-idx-1');
      saveSession(tmpDir, session);
      const indexPath = path.join(tmpDir, '.ai', 'reports', 'collaboration', 'index.json');
      expect(fs.existsSync(indexPath)).toBe(true);
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      expect(index).toContain('test-idx-1');
    });

    it('nao deve duplicar ID no indice', () => {
      const session = makeSession('test-no-dup');
      saveSession(tmpDir, session);
      saveSession(tmpDir, session);
      const indexPath = path.join(tmpDir, '.ai', 'reports', 'collaboration', 'index.json');
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      const occurrences = index.filter((id: string) => id === 'test-no-dup').length;
      expect(occurrences).toBe(1);
    });
  });

  describe('loadSession', () => {
    it('deve carregar sessao existente', () => {
      const session = makeSession('test-load-1');
      saveSession(tmpDir, session);
      const loaded = loadSession(tmpDir, 'test-load-1');
      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe('test-load-1');
    });

    it('deve retornar null para sessao inexistente', () => {
      expect(loadSession(tmpDir, 'nonexistent')).toBeNull();
    });

    it('deve retornar null para JSON invalido', () => {
      const filePath = path.join(tmpDir, '.ai', 'reports', 'collaboration', 'bad-json.json');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'not-json');
      expect(loadSession(tmpDir, 'bad-json')).toBeNull();
    });
  });

  describe('listSessions', () => {
    it('deve listar sessoes salvas', () => {
      saveSession(tmpDir, makeSession('list-1'));
      saveSession(tmpDir, makeSession('list-2'));
      const sessions = listSessions(tmpDir);
      const ids = sessions.map(s => s.id);
      expect(ids).toContain('list-1');
      expect(ids).toContain('list-2');
    });

    it('deve retornar array vazio se nao ha sessoes', () => {
      const emptyDir = path.join(os.tmpdir(), `empty-collab-${Date.now()}`);
      fs.mkdirSync(emptyDir, { recursive: true });
      expect(listSessions(emptyDir)).toEqual([]);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});