import { bootstrapProject, generateModuleDocs, generatePromptPack, BootstrapConfig } from '../runtime/bootstrap-engine';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

describe('bootstrap-engine', () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bootstrap-test-'));

  afterAll(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('bootstrapProject', () => {
    const config: BootstrapConfig = {
      projectName: 'test-app',
      stack: 'node',
      features: ['typescript', 'testing'],
      outputDir: tmpDir,
    };

    it('deve criar estrutura basica com package.json, tsconfig, src/index.ts', () => {
      const result = bootstrapProject(config);
      expect(result.created.length).toBeGreaterThan(0);
      expect(result.errors).toEqual([]);
      expect(fs.existsSync(path.join(tmpDir, 'test-app', 'package.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'test-app', 'tsconfig.json'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'test-app', 'src', 'index.ts'))).toBe(true);
    });

    it('deve criar README.md com nome do projeto', () => {
      bootstrapProject(config);
      const readme = fs.readFileSync(path.join(tmpDir, 'test-app', 'README.md'), 'utf8');
      expect(readme).toContain('test-app');
    });

    it('deve pular arquivos existentes na segunda execucao', () => {
      const result = bootstrapProject(config);
      expect(result.skipped.length).toBeGreaterThan(0);
      expect(result.created.length).toBe(0);
    });

    it('deve criar .gitignore', () => {
      expect(fs.existsSync(path.join(tmpDir, 'test-app', '.gitignore'))).toBe(true);
    });

    it('deve criar arquivos express/api quando feature incluida', () => {
      const expressConfig: BootstrapConfig = {
        ...config,
        projectName: 'express-app',
        features: ['express', 'api'],
      };
      const result = bootstrapProject(expressConfig);
      expect(result.errors).toEqual([]);
      expect(fs.existsSync(path.join(tmpDir, 'express-app', 'src', 'app.ts'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'express-app', 'src', '__tests__', 'app.test.ts'))).toBe(true);
    });

    it('deve criar Dockerfile e docker-compose quando feature docker incluida', () => {
      const dockerConfig: BootstrapConfig = {
        ...config,
        projectName: 'docker-app',
        features: ['docker'],
      };
      const result = bootstrapProject(dockerConfig);
      expect(result.errors).toEqual([]);
      expect(fs.existsSync(path.join(tmpDir, 'docker-app', 'Dockerfile'))).toBe(true);
      expect(fs.existsSync(path.join(tmpDir, 'docker-app', 'docker-compose.yml'))).toBe(true);
    });

    it('deve criar .env.example quando feature env incluida', () => {
      const envConfig: BootstrapConfig = {
        ...config,
        projectName: 'env-app',
        features: ['env'],
      };
      const result = bootstrapProject(envConfig);
      expect(result.errors).toEqual([]);
      expect(fs.existsSync(path.join(tmpDir, 'env-app', '.env.example'))).toBe(true);
    });

    it('deve retornar erro quando nao consegue criar diretorio', () => {
      const invalidConfig: BootstrapConfig = {
        ...config,
        projectName: 'invalid',
        outputDir: 'CON:', // Nome reservado do Windows que não pode ser criado
      };
      const result = bootstrapProject(invalidConfig);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.summary).toContain('Falha');
    });
  });

  describe('generateModuleDocs', () => {
    it('deve gerar markdown com informacoes dos modulos', () => {
      const modules = [
        {
          name: 'auth',
          file: 'src/auth.ts',
          description: 'Modulo de autenticacao',
          exports: ['login', 'logout', 'validateToken'],
        },
      ];
      const docs = generateModuleDocs(modules);
      expect(docs).toContain('# Documentacao Viva dos Modulos');
      expect(docs).toContain('## auth');
      expect(docs).toContain('**Arquivo:** `src/auth.ts`');
      expect(docs).toContain('Modulo de autenticacao');
      expect(docs).toContain('**Exports:**');
      expect(docs).toContain('- `login`');
      expect(docs).toContain('- `logout`');
      expect(docs).toContain('- `validateToken`');
    });

    it('deve gerar docs para multiplos modulos', () => {
      const modules = [
        { name: 'auth', file: 'src/auth.ts', description: 'Auth module', exports: ['login'] },
        { name: 'db', file: 'src/db.ts', description: 'Database module', exports: ['connect', 'query'] },
      ];
      const docs = generateModuleDocs(modules);
      expect(docs).toContain('## auth');
      expect(docs).toContain('## db');
    });

    it('deve lidar com modulo sem exports', () => {
      const modules = [
        { name: 'utils', file: 'src/utils.ts', description: 'Utils', exports: [] },
      ];
      const docs = generateModuleDocs(modules);
      expect(docs).not.toContain('**Exports:**');
    });
  });

  describe('generatePromptPack', () => {
    it('deve gerar prompt pack com modulos e comandos CLI', () => {
      const modules = [
        {
          name: 'scorecard',
          description: 'Gera scorecard do projeto',
          cli: 'ai-devkit scorecard --json',
        },
      ];
      const pack = generatePromptPack(modules);
      expect(pack).toContain('# Prompt Pack — ai-devkit');
      expect(pack).toContain('### scorecard');
      expect(pack).toContain('Gera scorecard do projeto');
      expect(pack).toContain('```bash');
      expect(pack).toContain('ai-devkit scorecard --json');
      expect(pack).toContain('```');
    });

    it('deve lidar com modulo sem comando CLI', () => {
      const modules = [
        { name: 'helper', description: 'Helper module', cli: '' },
      ];
      const pack = generatePromptPack(modules);
      expect(pack).toContain('### helper');
      expect(pack).not.toContain('```bash');
    });

    it('deve gerar pack para multiplos modulos', () => {
      const modules = [
        { name: 'scorecard', description: 'Scorecard', cli: 'ai-devkit scorecard' },
        { name: 'compile', description: 'Compile', cli: 'ai-devkit compile' },
      ];
      const pack = generatePromptPack(modules);
      expect(pack).toContain('### scorecard');
      expect(pack).toContain('### compile');
    });
  });
});