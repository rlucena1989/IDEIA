import { upsertPackageScripts, ScriptResult } from '../utils/package-json';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('package-json - upsertPackageScripts', () => {
  let tempDir: string;
  let packageJsonPath: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'package-json-test-'));
    packageJsonPath = path.join(tempDir, 'package.json');
  });

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  it('deve adicionar scripts de IA em modo normal', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'test', scripts: {} }));

    const result = upsertPackageScripts(packageJsonPath, false, false);

    expect(result.added.length).toBeGreaterThan(0);
    expect(result.added).toContain('ai:verify');
    expect(result.added).toContain('ai:status');
    expect(result.skipped).toHaveLength(0);
    expect(result.overwritten).toHaveLength(0);

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('ai-devkit verify');
    expect(pkg.scripts['ai:status']).toBe('ai-devkit status');
  });

  it('deve pular scripts existentes sem force', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({
      name: 'test',
      scripts: { 'ai:verify': 'custom command' }
    }));

    const result = upsertPackageScripts(packageJsonPath, false, false);

    expect(result.skipped).toContain('ai:verify');
    expect(result.added).not.toContain('ai:verify');

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('custom command');
  });

  it('deve sobrescrever scripts existentes com force', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({
      name: 'test',
      scripts: { 'ai:verify': 'custom command' }
    }));

    const result = upsertPackageScripts(packageJsonPath, true, false);

    expect(result.overwritten).toContain('ai:verify');
    expect(result.added).not.toContain('ai:verify');

    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('ai-devkit verify');
  });

  it('deve preservar scripts não relacionados a IA', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({
      name: 'test',
      scripts: {
        'build': 'tsc',
        'test': 'jest',
        'ai:verify': 'ai-devkit verify'
      }
    }));

    const result = upsertPackageScripts(packageJsonPath, false, false);

    expect(result.preserved).toContain('build');
    expect(result.preserved).toContain('test');
    expect(result.preserved).not.toContain('ai:verify');
  });

  it('deve executar em modo dry-run sem modificar arquivo', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'test', scripts: {} }));
    const originalContent = fs.readFileSync(packageJsonPath, 'utf8');

    const result = upsertPackageScripts(packageJsonPath, false, true);

    expect(result.added.length).toBeGreaterThan(0);
    expect(fs.readFileSync(packageJsonPath, 'utf8')).toBe(originalContent);
  });

  it('deve criar arquivo se não existir', () => {
    const newPackagePath = path.join(tempDir, 'new-package.json');

    const result = upsertPackageScripts(newPackagePath, false, false);

    expect(result.added.length).toBeGreaterThan(0);
    expect(fs.existsSync(newPackagePath)).toBe(true);

    const pkg = JSON.parse(fs.readFileSync(newPackagePath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('ai-devkit verify');
  });

  it('deve lidar com JSON inválido', () => {
    fs.writeFileSync(packageJsonPath, 'invalid json');

    const result = upsertPackageScripts(packageJsonPath, false, false);

    expect(result.added.length).toBeGreaterThan(0);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.scripts['ai:verify']).toBe('ai-devkit verify');
  });

  it('deve lidar com package.json sem campo scripts', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'test' }));

    const result = upsertPackageScripts(packageJsonPath, false, false);

    expect(result.added.length).toBeGreaterThan(0);
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts['ai:verify']).toBe('ai-devkit verify');
  });

  it('deve detectar repositório devkit e incluir check-installer', () => {
    fs.mkdirSync(path.join(tempDir, 'packages', 'cli'), { recursive: true });
    fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'test', scripts: {} }));

    const result = upsertPackageScripts(packageJsonPath, false, false);

    expect(result.added).toContain('ai:check:installer');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    expect(pkg.scripts['ai:check:installer']).toBe('node .ai/bin/check-installer.js');
  });

  it('deve adicionar todos os scripts de IA padrão', () => {
    fs.writeFileSync(packageJsonPath, JSON.stringify({ name: 'test', scripts: {} }));

    const result = upsertPackageScripts(packageJsonPath, false, false);

    const expectedScripts = [
      'ai:verify', 'ai:status', 'ai:doctor', 'ai:sync', 'ai:audit',
      'ai:context', 'ai:feature', 'ai:prevention', 'ai:quality:gate'
    ];

    expectedScripts.forEach(script => {
      expect(result.added).toContain(script);
    });
  });
});
