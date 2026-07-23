import { createBaseline, loadBaseline, detectDowngrades, classifySeverity, BaselineEntry } from '../security/baseline';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('security/baseline', () => {
  let tmpDir: string;

  beforeAll(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'baseline-test-')); });
  afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  describe('classifySeverity', () => {
    it('critical para palavras de senha/credential', () => {
      expect(classifySeverity('nao compartilhar senhas')).toBe('critical');
      expect(classifySeverity('credentials file')).toBe('critical');
      expect(classifySeverity('secret key')).toBe('critical');
    });
    it('high para seguranca/block/proibido', () => {
      expect(classifySeverity('regra de seguranca')).toBe('high');
      expect(classifySeverity('block access')).toBe('high');
      expect(classifySeverity('proibido usar eval')).toBe('high');
    });
    it('medium para test/valid/cobertura', () => {
      expect(classifySeverity('validar entradas')).toBe('medium');
      expect(classifySeverity('cobertura de 80%')).toBe('medium');
    });
    it('low para outros textos', () => {
      expect(classifySeverity('usar camelCase')).toBe('low');
    });
  });

  describe('createBaseline', () => {
    it('deve criar baseline vazio quando nao ha arquivos de governanca', () => {
      const entries = createBaseline(tmpDir);
      expect(entries).toEqual([]);
    });

    it('deve extrair regras de laws.yaml', () => {
      const lawsDir = path.join(tmpDir, '.ai');
      fs.mkdirSync(lawsDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ai', 'laws.yaml'), 'rules:\n  - "nao compartilhar senhas"\n  - "validar entradas"');
      const entries = createBaseline(tmpDir);
      expect(entries.length).toBeGreaterThan(0);
      const lawsEntry = entries.find(e => e.file === '.ai/laws.yaml');
      expect(lawsEntry).toBeDefined();
      expect(lawsEntry!.rules.length).toBe(2);
    });

    it('deve persistir baseline em .ai/security/baseline.json', () => {
      const lawsDir = path.join(tmpDir, '.ai');
      fs.mkdirSync(lawsDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ai', 'laws.yaml'), 'rules:\n  - "nao compartilhar senhas"');
      createBaseline(tmpDir);
      const baselinePath = path.join(tmpDir, '.ai', 'security', 'baseline.json');
      expect(fs.existsSync(baselinePath)).toBe(true);
    });
  });

  describe('loadBaseline', () => {
    it('deve carregar baseline salvo', () => {
      const baselineDir = path.join(tmpDir, '.ai', 'security');
      fs.mkdirSync(baselineDir, { recursive: true });
      fs.writeFileSync(path.join(tmpDir, '.ai', 'security', 'baseline.json'), JSON.stringify([{ file: 'test', rules: [{ text: 'rule', severity: 'high' }] }]));
      const loaded = loadBaseline(tmpDir);
      expect(loaded).toHaveLength(1);
    });

    it('deve retornar array vazio quando nao existe', () => {
      const emptyDir = path.join(os.tmpdir(), `no-baseline-${Date.now()}`);
      fs.mkdirSync(emptyDir, { recursive: true });
      expect(loadBaseline(emptyDir)).toEqual([]);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });

  describe('detectDowngrades', () => {
    it('deve detectar regra removida', () => {
      const baseline = [{ file: '.ai/laws.yaml', rules: [{ text: 'nao usar eval', severity: 'high' as const }] }];
      const current = [{ file: '.ai/laws.yaml', rules: [] }];
      const findings = detectDowngrades(baseline, current);
      expect(findings).toHaveLength(1);
      expect(findings[0].action).toBe('removed');
    });

    it('deve detectar arquivo inteiro removido', () => {
      const baseline = [{ file: '.ai/laws.yaml', rules: [{ text: 'rule1', severity: 'high' as const }] }];
      const findings = detectDowngrades(baseline, []);
      expect(findings).toHaveLength(1);
    });

it('deve retornar vazio quando baseline intacto', () => {
      const baseline: BaselineEntry[] = [{ file: '.ai/laws.yaml', rules: [{ text: 'rule1', severity: 'medium' as const }] }];
      const current: BaselineEntry[] = [{ file: '.ai/laws.yaml', rules: [{ text: 'rule1', severity: 'medium' as const }] }];
      expect(detectDowngrades(baseline, current)).toEqual([]);
    });
  });
});