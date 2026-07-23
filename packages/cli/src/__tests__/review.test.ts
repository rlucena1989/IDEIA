import { antiSlop, regressionCheck, securityScan, performanceCheck, runReview, ReviewFinding } from '../utils/review';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function createTempDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'review-'));
}

function removeTempDir(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { }
}

function writeTestFile(dir: string, name: string, content: string): string {
  const filePath = path.join(dir, name);
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

describe('review - antiSlop', () => {
  it('deve detectar TODO sem referencia de ticket', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'test.ts', '// TODO: implement this\nconst x = 1;');
    const findings = antiSlop(dir);
    expect(findings.length).toBeGreaterThanOrEqual(1);
    expect(findings.some(f => f.message.includes('TODO'))).toBe(true);
    removeTempDir(dir);
  });

  it('deve ignorar TODO com referencia de ticket', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'test.ts', '// TODO(PRJ-123): implement this\nconst x = 1;');
    const findings = antiSlop(dir);
    const todoFindings = findings.filter(f => f.message.includes('TODO'));
    expect(todoFindings.length).toBe(0);
    removeTempDir(dir);
  });

  it('deve detectar console.log em codigo de producao', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'src/app.ts', 'console.log("debug");\nconst x = 1;');
    const findings = antiSlop(dir);
    expect(findings.some(f => f.message.includes('console.log'))).toBe(true);
    removeTempDir(dir);
  });

  it('deve ignorar console.log em arquivos de teste', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'src/app.test.ts', 'console.log("debug");\nconst x = 1;');
    const findings = antiSlop(dir);
    const consoleFindings = findings.filter(f => f.message.includes('console.log'));
    expect(consoleFindings.length).toBe(0);
    removeTempDir(dir);
  });

  it('deve detectar catch block vazio', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'handler.ts', 'try { doSomething(); } catch (err) { }');
    const findings = antiSlop(dir);
    expect(findings.some(f => f.message.includes('Catch block'))).toBe(true);
    removeTempDir(dir);
  });

  it('deve detectar linhas duplicadas', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'config.ts', Array(10).fill('export const MODULE_NAME = "my-module";\n').join(''));
    const findings = antiSlop(dir);
    expect(findings.some(f => f.message.includes('duplicada'))).toBe(true);
    removeTempDir(dir);
  });

  it('deve ignorar diretorios node_modules', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'node_modules/lib/index.ts', '// TODO: fix this');
    const findings = antiSlop(dir);
    const nodeModulesFindings = findings.filter(f => f.file.includes('node_modules'));
    expect(nodeModulesFindings.length).toBe(0);
    removeTempDir(dir);
  });
});

describe('review - regressionCheck', () => {
  it('deve detectar exports duplicados', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'a.ts', 'export interface User { name: string; }');
    writeTestFile(dir, 'b.ts', 'export interface User { email: string; }');
    const findings = regressionCheck(dir);
    expect(findings.some(f => f.message.includes('Export'))).toBe(true);
    removeTempDir(dir);
  });

  it('nao deve gerar falso positivo para exports unicos', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'a.ts', 'export interface User { name: string; }');
    writeTestFile(dir, 'b.ts', 'export interface Admin { role: string; }');
    const findings = regressionCheck(dir);
    const exportFindings = findings.filter(f => f.message.includes('Export'));
    expect(exportFindings.length).toBe(0);
    removeTempDir(dir);
  });
});

describe('review - securityScan', () => {
  it('deve detectar api key hardcoded', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'config.ts', 'const API_KEY = "sk-1234567890abcdef";');
    const findings = securityScan(dir);
    expect(findings.some(f => f.type === 'security' && f.severity === 'critical')).toBe(true);
    removeTempDir(dir);
  });

  it('deve detectar private key', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'keys.ts', 'const key = "-----BEGIN RSA PRIVATE KEY-----MIIEpAIBAAKCAQEA...";');
    const findings = securityScan(dir);
    expect(findings.some(f => f.message.includes('Chave privada'))).toBe(true);
    removeTempDir(dir);
  });

  it('deve detectar env var sendo sobrescrita', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'app.ts', 'process.env.NODE_ENV = "development";');
    const findings = securityScan(dir);
    expect(findings.some(f => f.message.includes('Variavel de ambiente'))).toBe(true);
    removeTempDir(dir);
  });
});

describe('review - performanceCheck', () => {
  it('deve detectar await dentro de loop', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'service.ts', 'for (const item of items) { const result = await fetch(item); }');
    const findings = performanceCheck(dir);
    expect(findings.some(f => f.type === 'performance')).toBe(true);
    removeTempDir(dir);
  });

  it('deve detectar fs sincrono', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'utils.ts', 'const data = fs.readFileSync("file.txt", "utf8");');
    const findings = performanceCheck(dir);
    expect(findings.some(f => f.message.includes('I/O sincrona'))).toBe(true);
    removeTempDir(dir);
  });

  it('deve detectar array literal grande', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'data.ts', 'const items = [' + Array(22).fill('"i"').join(',') + '];');
    const findings = performanceCheck(dir);
    expect(findings.some(f => f.message.includes('Array literal') || f.message.includes('inline'))).toBe(true);
    removeTempDir(dir);
  });
});

describe('review - runReview', () => {
  it('deve executar checks especificos', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'test.ts', '// TODO: implement');
    writeTestFile(dir, 'secret.ts', 'const API_KEY = "sk-test";');
    const result = runReview(['anti-slop', 'security'], dir, false);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.summary.total).toBe(result.findings.length);
    removeTempDir(dir);
  });

  it('deve executar all checks', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'test.ts', '// TODO: implement\nconst x = 1;');
    const result = runReview(['anti-slop', 'regression', 'security', 'performance'], dir, false);
    expect(result.summary.total).toBe(result.findings.length);
    expect(result.summary.total).toBeGreaterThanOrEqual(0);
    removeTempDir(dir);
  });

  it('deve retornar summary com contagens corretas', () => {
    const dir = createTempDir();
    writeTestFile(dir, 'test.ts', '// TODO: implement\nconsole.log("hi");');
    const result = runReview(['anti-slop'], dir, false);
    expect(result.summary).toHaveProperty('total');
    expect(result.summary).toHaveProperty('critical');
    expect(result.summary).toHaveProperty('high');
    expect(result.summary).toHaveProperty('medium');
    expect(result.summary).toHaveProperty('low');
    removeTempDir(dir);
  });
});
