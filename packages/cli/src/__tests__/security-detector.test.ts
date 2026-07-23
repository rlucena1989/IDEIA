import { evaluateFindings, logDowngradeAttempt, loadDowngradeLogs } from '../security/detector';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('security/detector', () => {
  let tmpDir: string;

  beforeAll(() => { tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'detector-test-')); });
  afterAll(() => { fs.rmSync(tmpDir, { recursive: true, force: true }); });

  describe('evaluateFindings', () => {
    it('deve retornar nao bloqueado quando nao ha findings', () => {
      const result = evaluateFindings([], false);
      expect(result.blocked).toBe(false);
      expect(result.message).toContain('Nenhum downgrade');
    });

    it('deve bloquear quando ha finding critico sem force', () => {
      const findings = [{ file: 'test', rule: 'senha', severity: 'critical' as const, action: 'removed' as const }];
      const result = evaluateFindings(findings, false);
      expect(result.blocked).toBe(true);
      expect(result.criticalCount).toBe(1);
      expect(result.message).toContain('BLOQUEADO');
    });

    it('deve bypassar com force', () => {
      const findings = [{ file: 'test', rule: 'senha', severity: 'critical' as const, action: 'removed' as const }];
      const result = evaluateFindings(findings, true, 'teste consciente');
      expect(result.blocked).toBe(false);
      expect(result.message).toContain('BYPASS');
    });

    it('deve apenas avisar para findings nao criticos', () => {
      const findings = [{ file: 'test', rule: 'usar camelCase', severity: 'low' as const, action: 'removed' as const }];
      const result = evaluateFindings(findings, false);
      expect(result.blocked).toBe(false);
      expect(result.message).toContain('ATENCAO');
    });
  });

  describe('logDowngradeAttempt', () => {
    it('deve registrar tentativa de downgrade', () => {
      const finding = { file: '.ai/laws.yaml', rule: 'nao usar eval', severity: 'high' as const, action: 'removed' as const };
      logDowngradeAttempt(tmpDir, finding, 'precisa para o build');
      const logPath = path.join(tmpDir, '.ai', 'reports', 'security', 'downgrades.jsonl');
      expect(fs.existsSync(logPath)).toBe(true);
      const logs = loadDowngradeLogs(tmpDir);
      expect(logs).toHaveLength(1);
      expect(logs[0].rule).toBe('nao usar eval');
    });
  });

  describe('loadDowngradeLogs', () => {
    it('deve retornar array vazio quando log nao existe', () => {
      const emptyDir = path.join(os.tmpdir(), `no-logs-${Date.now()}`);
      fs.mkdirSync(emptyDir, { recursive: true });
      expect(loadDowngradeLogs(emptyDir)).toEqual([]);
      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});