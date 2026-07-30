import { describe, it, expect } from '@jest/globals';
import type {
  Blueprint,
  Variable,
  FileTemplate,
  Dependency,
  ConfigFile,
  ContractDefinition,
  ContractInterface,
  ContractMethod,
  ContractEvent,
  ADREntry,
  BlueprintManifest,
  ScaffoldOptions,
  ScaffoldResult,
  ResolvedDependencies,
  DependencyError,
  DependencyWarning,
  GeneratedConfig,
  GeneratedContract,
  GeneratedADR,
  TemplateContext,
} from '../types';

describe('Blueprint types', () => {
  describe('Blueprint', () => {
    it('can be constructed with required fields', () => {
      const bp: Blueprint = { name: 'test', version: '1.0.0', description: 'desc' };
      expect(bp.name).toBe('test');
      expect(bp.version).toBe('1.0.0');
      expect(bp.description).toBe('desc');
    });

    it('allows optional fields', () => {
      const bp: Blueprint = { name: 'test', version: '1.0.0', description: 'desc', author: 'me', tags: ['ts'] };
      expect(bp.author).toBe('me');
      expect(bp.tags).toEqual(['ts']);
    });
  });

  describe('Variable', () => {
    it('accepts valid type values', () => {
      const v: Variable = { name: 'port', type: 'number' };
      expect(v.name).toBe('port');
      expect(v.type).toBe('number');
    });

    it('accepts select type with options', () => {
      const v: Variable = { name: 'framework', type: 'select', options: ['express', 'fastify'] };
      expect(v.options).toEqual(['express', 'fastify']);
    });

    it('allows multi-select type', () => {
      const v: Variable = { name: 'features', type: 'multi-select' };
      expect(v.type).toBe('multi-select');
    });

    it('allows validate string', () => {
      const v: Variable = { name: 'port', type: 'number', validate: 'port > 0 && port < 65536' };
      expect(v.validate).toBeDefined();
    });
  });

  describe('FileTemplate', () => {
    it('has path and content', () => {
      const ft: FileTemplate = { path: 'src/index.ts', content: '// empty' };
      expect(ft.path).toBe('src/index.ts');
      expect(ft.content).toBe('// empty');
    });

    it('allows templateEngine', () => {
      const ft: FileTemplate = { path: 'tpl.ejs', content: '<%= name %>', templateEngine: 'ejs' };
      expect(ft.templateEngine).toBe('ejs');
    });

    it('allows condition and generate', () => {
      const ft: FileTemplate = { path: 'x', content: 'y', condition: 'useX', generate: 'always' };
      expect(ft.condition).toBe('useX');
      expect(ft.generate).toBe('always');
    });
  });

  describe('Dependency', () => {
    it('has name and version', () => {
      const d: Dependency = { name: 'express', version: '^4.18.0' };
      expect(d.name).toBe('express');
      expect(d.version).toBe('^4.18.0');
    });

    it('allows dev flag', () => {
      const d: Dependency = { name: 'jest', version: '^29.0.0', dev: true };
      expect(d.dev).toBe(true);
    });

    it('allows optional flag', () => {
      const d: Dependency = { name: 'fsevents', version: '^2.3.0', optional: true };
      expect(d.optional).toBe(true);
    });
  });

  describe('ConfigFile', () => {
    it('has path, content, and format', () => {
      const cf: ConfigFile = { path: '.eslintrc.json', content: { rules: {} }, format: 'json' };
      expect(cf.path).toBe('.eslintrc.json');
      expect(cf.content).toEqual({ rules: {} });
      expect(cf.format).toBe('json');
    });

    it('yaml format is valid', () => {
      const cf: ConfigFile = { path: 'docker-compose.yml', content: { version: '3.8' }, format: 'yaml' };
      expect(cf.format).toBe('yaml');
    });
  });

  describe('ContractDefinition', () => {
    it('has required fields', () => {
      const cd: ContractDefinition = { name: 'user', version: '1.0.0', schema: 'z.object({})' };
      expect(cd.name).toBe('user');
      expect(cd.version).toBe('1.0.0');
      expect(cd.schema).toBe('z.object({})');
    });

    it('allows interfaces and events', () => {
      const cd: ContractDefinition = {
        name: 'user', version: '1.0.0', schema: 'z.object({})',
        interfaces: [{ name: 'IUserService', methods: [{ name: 'find', params: [], returns: 'void' }] }],
        events: [{ name: 'created', payload: 'string' }],
      };
      expect(cd.interfaces).toHaveLength(1);
      expect(cd.events).toHaveLength(1);
    });
  });

  describe('ContractInterface', () => {
    it('has name and methods', () => {
      const ci: ContractInterface = {
        name: 'IService',
        methods: [{ name: 'do', params: [{ name: 'x', type: 'string' }], returns: 'void' }],
      };
      expect(ci.name).toBe('IService');
      expect(ci.methods[0].name).toBe('do');
    });
  });

  describe('ContractMethod', () => {
    it('has name, params, returns', () => {
      const cm: ContractMethod = {
        name: 'execute',
        params: [{ name: 'input', type: 'string' }],
        returns: 'Promise<void>',
      };
      expect(cm.name).toBe('execute');
      expect(cm.params[0].name).toBe('input');
      expect(cm.returns).toBe('Promise<void>');
    });
  });

  describe('ContractEvent', () => {
    it('has name, payload, optional description', () => {
      const ce: ContractEvent = { name: 'user.created', payload: '{ id: string }', description: 'User created' };
      expect(ce.name).toBe('user.created');
      expect(ce.payload).toBe('{ id: string }');
      expect(ce.description).toBe('User created');
    });
  });

  describe('ADREntry', () => {
    it('has required fields with valid status', () => {
      const adr: ADREntry = {
        id: 'ADR-0001', title: 'Use Node.js', status: 'Accepted',
        context: 'Need runtime', decision: 'Use Node.js', consequences: ['Ecosystem'],
      };
      expect(adr.id).toBe('ADR-0001');
      expect(adr.status).toBe('Accepted');
    });

    it('allows Proposed status', () => {
      const adr: ADREntry = {
        id: 'ADR-0002', title: 'Test', status: 'Proposed',
        context: 'x', decision: 'y', consequences: ['z'],
      };
      expect(adr.status).toBe('Proposed');
    });

    it('allows Deprecated status', () => {
      const adr: ADREntry = {
        id: 'ADR-0003', title: 'Old', status: 'Deprecated',
        context: 'x', decision: 'y', consequences: ['z'],
      };
      expect(adr.status).toBe('Deprecated');
    });

    it('allows Superseded status', () => {
      const adr: ADREntry = {
        id: 'ADR-0004', title: 'Replaced', status: 'Superseded',
        context: 'x', decision: 'y', consequences: ['z'],
      };
      expect(adr.status).toBe('Superseded');
    });
  });

  describe('BlueprintManifest', () => {
    it('has required name, version, description', () => {
      const m: BlueprintManifest = { name: 'app', version: '1.0.0', description: 'desc' };
      expect(m.name).toBe('app');
    });

    it('allows compatibility info', () => {
      const m: BlueprintManifest = {
        name: 'app', version: '1.0.0', description: 'desc',
        compatibility: { ideia: '>=1.0', node: '>=18', pnpm: '>=8' },
      };
      expect(m.compatibility?.ideia).toBe('>=1.0');
    });

    it('allows variables, structure, dependencies, configs', () => {
      const m: BlueprintManifest = {
        name: 'app', version: '1.0.0', description: 'desc',
        variables: [{ name: 'port', type: 'number' }],
        structure: { src: {} },
        dependencies: { dependencies: { express: '^4.0.0' } },
        configs: { eslint: {} },
      };
      expect(m.variables).toHaveLength(1);
      expect(m.dependencies?.dependencies?.express).toBe('^4.0.0');
    });

    it('allows contracts and adrs', () => {
      const m: BlueprintManifest = {
        name: 'app', version: '1.0.0', description: 'desc',
        contracts: { modules: [], schemaFormat: 'zod', generateTests: true },
        adrs: { autoGenerate: true, templates: [{ title: 'ADR 1' }] },
      };
      expect(m.contracts?.schemaFormat).toBe('zod');
      expect(m.adrs?.templates).toHaveLength(1);
    });

    it('allows postProcess', () => {
      const m: BlueprintManifest = {
        name: 'app', version: '1.0.0', description: 'desc',
        postProcess: [{ command: 'npm install', description: 'Install deps', timeout: 60000 }],
      };
      expect(m.postProcess).toHaveLength(1);
      expect(m.postProcess![0].command).toBe('npm install');
    });
  });

  describe('ScaffoldOptions', () => {
    it('requires outputDir', () => {
      const o: ScaffoldOptions = { outputDir: './my-app' };
      expect(o.outputDir).toBe('./my-app');
    });

    it('allows all optional flags', () => {
      const o: ScaffoldOptions = {
        outputDir: '.', variables: { port: '3000' },
        skipInstall: true, skipGit: true, force: true, ci: true,
      };
      expect(o.variables).toEqual({ port: '3000' });
      expect(o.skipInstall).toBe(true);
      expect(o.ci).toBe(true);
    });
  });

  describe('ScaffoldResult', () => {
    it('has all required fields', () => {
      const r: ScaffoldResult = {
        projectPath: '/tmp/app', filesCreated: 10, filesSkipped: 2,
        dependenciesInstalled: true, gitInitialized: true,
        adrsGenerated: 5, contractsGenerated: 2,
        duration: 1500, errors: [], warnings: [],
      };
      expect(r.projectPath).toBe('/tmp/app');
      expect(r.filesCreated).toBe(10);
      expect(r.duration).toBe(1500);
    });
  });

  describe('ResolvedDependencies', () => {
    it('has all dependency categories', () => {
      const r: ResolvedDependencies = {
        dependencies: {}, devDependencies: {},
        peerDependencies: {}, optionalDependencies: {},
        errors: [], warnings: [],
      };
      expect(r.dependencies).toBeDefined();
      expect(r.peerDependencies).toBeDefined();
    });
  });

  describe('DependencyError', () => {
    it('has code, package, message', () => {
      const e: DependencyError = { code: 'NOT_FOUND', package: 'express', message: 'Not in registry' };
      expect(e.code).toBe('NOT_FOUND');
      expect(e.package).toBe('express');
      expect(e.message).toBe('Not in registry');
    });
  });

  describe('DependencyWarning', () => {
    it('has code, package, message', () => {
      const w: DependencyWarning = { code: 'VERSION_CONFLICT', package: 'lodash', message: 'Version mismatch' };
      expect(w.code).toBe('VERSION_CONFLICT');
      expect(w.package).toBe('lodash');
    });
  });

  describe('GeneratedConfig', () => {
    it('has path and content', () => {
      const g: GeneratedConfig = { path: '.eslintrc.json', content: '{}' };
      expect(g.path).toBe('.eslintrc.json');
      expect(g.content).toBe('{}');
    });
  });

  describe('GeneratedContract', () => {
    it('has path, content, format', () => {
      const g: GeneratedContract = { path: 'contract.ts', content: 'export {}', format: 'zod' };
      expect(g.path).toBe('contract.ts');
      expect(g.format).toBe('zod');
    });
  });

  describe('GeneratedADR', () => {
    it('has path, content, title, id', () => {
      const g: GeneratedADR = {
        path: 'docs/adr/ADR-0001.md', content: '# ADR', title: 'Test', id: 'ADR-0001',
      };
      expect(g.path).toBe('docs/adr/ADR-0001.md');
      expect(g.title).toBe('Test');
      expect(g.id).toBe('ADR-0001');
    });
  });

  describe('TemplateContext', () => {
    it('has all required fields', () => {
      const ctx: TemplateContext = {
        projectName: 'my-app',
        projectNamePascal: 'MyApp',
        projectNameCamel: 'myApp',
        projectNameKebab: 'my-app',
        projectNameSnake: 'my_app',
        description: 'desc',
        features: ['api'],
        createdAt: '2026-01-01T00:00:00.000Z',
        ideiaVersion: '1.0.0',
        nodeVersion: 'v20.0.0',
      };
      expect(ctx.projectName).toBe('my-app');
      expect(ctx.projectNamePascal).toBe('MyApp');
      expect(ctx.projectNameSnake).toBe('my_app');
      expect(ctx.features).toContain('api');
    });

    it('allows additional index signature fields', () => {
      const ctx: TemplateContext = {
        projectName: 'app',
        projectNamePascal: 'App',
        projectNameCamel: 'app',
        projectNameKebab: 'app',
        projectNameSnake: 'app',
        description: '',
        features: [],
        createdAt: '',
        ideiaVersion: '',
        nodeVersion: '',
        customField: 'custom value',
      };
      expect(ctx.customField).toBe('custom value');
    });
  });
});
