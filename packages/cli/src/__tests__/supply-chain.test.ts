import { audit, printScanReport, CveEntry, ScanResult } from '../utils/supply-chain';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('supply-chain', () => {
  describe('audit', () => {
    it('deve retornar added como todas as entradas quando nao ha baseline', () => {
      const entries: CveEntry[] = [
        { package: 'lodash', version: '4.17.20', cve: 'CVE-2021-1234', severity: 'high' },
      ];
      const result = audit(entries);
      expect(result.changed).toBe(false);
      expect(result.added).toHaveLength(1);
      expect(result.removed).toHaveLength(0);
    });

    it('deve retornar changed=false quando baseline contem todas as entradas', () => {
      const entries: CveEntry[] = [
        { package: 'lodash', version: '4.17.20', cve: 'CVE-2021-1234', severity: 'high' },
      ];
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supply-'));
      const baselinePath = path.join(tmpDir, 'baseline.json');
      fs.writeFileSync(baselinePath, JSON.stringify(entries));
      const result = audit(entries, baselinePath);
      expect(result.changed).toBe(false);
      expect(result.added).toHaveLength(0);
      expect(result.removed).toHaveLength(0);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    it('deve detectar novas entradas nao presentes no baseline', () => {
      const existing: CveEntry[] = [
        { package: 'express', version: '4.17.1', cve: 'CVE-2021-22921', severity: 'medium' },
      ];
      const current: CveEntry[] = [
        { package: 'express', version: '4.17.1', cve: 'CVE-2021-22921', severity: 'medium' },
        { package: 'lodash', version: '4.17.20', cve: 'CVE-2021-1234', severity: 'high' },
      ];
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supply-'));
      const baselinePath = path.join(tmpDir, 'baseline.json');
      fs.writeFileSync(baselinePath, JSON.stringify(existing));
      const result = audit(current, baselinePath);
      expect(result.changed).toBe(true);
      expect(result.added).toHaveLength(1);
      expect(result.added[0].package).toBe('lodash');
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    it('deve detectar entradas removidas do baseline', () => {
      const existing: CveEntry[] = [
        { package: 'express', version: '4.17.1', cve: 'CVE-2021-22921', severity: 'medium' },
        { package: 'lodash', version: '4.17.20', cve: 'CVE-2021-1234', severity: 'high' },
      ];
      const current: CveEntry[] = [
        { package: 'express', version: '4.17.1', cve: 'CVE-2021-22921', severity: 'medium' },
      ];
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supply-'));
      const baselinePath = path.join(tmpDir, 'baseline.json');
      fs.writeFileSync(baselinePath, JSON.stringify(existing));
      const result = audit(current, baselinePath);
      expect(result.changed).toBe(true);
      expect(result.removed).toHaveLength(1);
      expect(result.removed[0].package).toBe('lodash');
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });

    it('deve tratar baseline malformado como se nao existisse', () => {
      const entries: CveEntry[] = [
        { package: 'test', version: '1.0.0', cve: 'CVE-2025-0001', severity: 'low' },
      ];
      const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'supply-'));
      const baselinePath = path.join(tmpDir, 'baseline.json');
      fs.writeFileSync(baselinePath, 'not json');
      const result = audit(entries, baselinePath);
      expect(result.changed).toBe(false);
      expect(result.added).toHaveLength(1);
      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}
    });
  });

  describe('printScanReport', () => {
    it('deve imprimir JSON quando json=true', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const result: ScanResult = {
        entries: [{ package: 'test', version: '1.0', cve: 'CVE-001', severity: 'high' }],
        summary: { total: 1, critical: 0, high: 1, medium: 0, low: 0 },
      };
      printScanReport(result, '/tmp', true);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('CVE-001'));
      spy.mockRestore();
    });

    it('deve imprimir relatorio formatado quando json=false', () => {
      const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
      const result: ScanResult = {
        entries: [],
        summary: { total: 0, critical: 0, high: 0, medium: 0, low: 0 },
      };
      printScanReport(result, '/tmp', false);
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});