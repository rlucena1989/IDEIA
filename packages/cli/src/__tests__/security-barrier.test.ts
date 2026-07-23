import { loadRules, saveRules, checkBarriers, addRule, BarrierRule } from '../utils/security/barrier';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('security/barrier', () => {
  let tmpDir: string;

  beforeAll(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'barrier-test-')); });
  afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  describe('loadRules', () => {
    it('deve carregar DEFAULT_RULES quando nao ha arquivo customizado', () => {
      const rules = loadRules(tmpDir);
      expect(rules.length).toBeGreaterThan(0);
      expect(rules.some(r => r.pattern === 'auth*.ts')).toBe(true);
    });
  });

  describe('checkBarriers (with default rules)', () => {
    it('deve bloquear arquivos que casam com regras block', () => {
      const result = checkBarriers(tmpDir, ['src/auth/login.ts', 'src/app.ts']);
      expect(result.blocked).toContain('src/auth/login.ts');
      expect(result.blocked).not.toContain('src/app.ts');
    });

    it('deve gerar warning para arquivos que casam com regras warn', () => {
      const result = checkBarriers(tmpDir, ['src/user-schema.ts']);
      expect(result.warnings).toContain('src/user-schema.ts');
    });

    it('deve aplicar bypass quando razao fornecida', () => {
      const result = checkBarriers(tmpDir, ['src/auth/login.ts'], 'teste autorizado');
      expect(result.blocked).toEqual([]);
      expect(result.bypass).toBe('teste autorizado');
    });

    it('deve retornar vazio para arquivos seguros', () => {
      const result = checkBarriers(tmpDir, ['src/app.ts', 'src/utils/helper.ts']);
      expect(result.blocked).toEqual([]);
      expect(result.warnings).toEqual([]);
    });
  });

  describe('saveRules', () => {
    it('deve persistir regras em .ai/policies/barriers.json', () => {
      const rules: BarrierRule[] = [{ pattern: '*.env', severity: 'block', description: 'Env files' }];
      saveRules(tmpDir, rules);
      const rulesPath = path.join(tmpDir, '.ai', 'policies', 'barriers.json');
      expect(fs.existsSync(rulesPath)).toBe(true);
      const loaded = JSON.parse(fs.readFileSync(rulesPath, 'utf8'));
      expect(loaded).toHaveLength(1);
    });
  });

  describe('loadRules (custom)', () => {
    it('deve carregar rules customizadas de .ai/policies/barriers.json', () => {
      const rules = loadRules(tmpDir);
      expect(rules).toHaveLength(1);
      expect(rules[0].pattern).toBe('*.env');
    });
  });

  describe('addRule', () => {
    it('deve adicionar regra a lista existente', () => {
      addRule(tmpDir, '*.secret', 'block', 'Secret files');
      const rules = loadRules(tmpDir);
      expect(rules.some(r => r.pattern === '*.secret')).toBe(true);
    });
  });
});