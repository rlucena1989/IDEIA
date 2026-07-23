import path from 'node:path';
import fs from 'node:fs';
import { buildVars, generateFiles } from '../generators/engine';

const TMP_BASE = path.join(__dirname, '../../.test-gen');
const VARS = buildVars('Product');
let uid = 0;

function freshTmp(): { dir: string; optsDry: any; optsWrite: any } {
  const dir = path.join(TMP_BASE, `gen_${uid++}`);
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(path.join(dir, '.ai', 'context'), { recursive: true });
  fs.writeFileSync(path.join(dir, '.ai', 'laws.yaml'), 'rules: []');
  fs.writeFileSync(path.join(dir, '.ai', 'project-manifest.yaml'), 'project: { name: "test" }');
  fs.writeFileSync(path.join(dir, '.ai', 'context', 'ai-handoff.md'), '# Handoff');
  fs.mkdirSync(path.join(dir, 'src'), { recursive: true });
  return { dir, optsDry: { dryRun: true, force: false, cwd: dir }, optsWrite: { dryRun: false, force: false, cwd: dir } };
}

afterAll(() => {
  try { fs.rmSync(TMP_BASE, { recursive: true, force: true }); } catch {}
});

describe('Generators — engine.ts', () => {
  it('buildVars gera de kebab', () => {
    const v = buildVars('user-card');
    expect(v.name).toBe('user-card');
    expect(v.Name).toBe('UserCard');
    expect(v.NAME).toBe('USER_CARD');
    expect(v.name_kebab).toBe('user-card');
    expect(v.name_plural).toBe('user-cards');
    expect(v.NamePlural).toBe('UserCards');
  });

  it('buildVars pascal-case', () => {
    const v = buildVars('Category');
    expect(v.name).toBe('Category');
    expect(v.Name).toBe('Category');
    expect(v.NAME).toBe('CATEGORY');
    expect(v.name_kebab).toBe('category');
    expect(v.name_plural).toBe('Categories');
    expect(v.NamePlural).toBe('Categories');
  });

  it('generateFiles dry-run', () => {
    const { dir, optsDry } = freshTmp();
    const r = generateFiles([{ path: '{{Name}}.ts', content: 'class {{Name}}' }], VARS, optsDry);
    expect(r.created.length).toBe(1);
    expect(fs.existsSync(path.join(dir, 'Product.ts'))).toBe(false);
  });

  it('generateFiles cria arquivos', () => {
    const { dir, optsWrite } = freshTmp();
    const r = generateFiles([{ path: '{{Name}}.ts', content: 'class {{Name}}' }], VARS, optsWrite);
    expect(r.created.length).toBe(1);
    expect(fs.existsSync(path.join(dir, 'Product.ts'))).toBe(true);
    expect(fs.readFileSync(path.join(dir, 'Product.ts'), 'utf8')).toContain('Product');
  });

  it('generateFiles skip existentes sem force', () => {
    const { dir, optsWrite } = freshTmp();
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'Product.ts'), 'original');
    const r = generateFiles([{ path: '{{Name}}.ts', content: 'class {{Name}}' }], VARS, optsWrite);
    expect(r.skipped.length).toBe(1);
  });

  it('generateFiles sobrescreve com force', () => {
    const { dir } = freshTmp();
    fs.writeFileSync(path.join(dir, 'Product.ts'), 'original');
    const r = generateFiles([{ path: '{{Name}}.ts', content: 'class {{Name}}' }], VARS, { dryRun: false, force: true, cwd: dir });
    expect(r.overwritten.length).toBe(1);
    expect(fs.readFileSync(path.join(dir, 'Product.ts'), 'utf8')).toContain('Product');
  });
});

// Helper to test generators — each generator gets an isolated tmp directory
function testGen(name: string, fn: (name: string, options: any) => void) {
  describe(`Generator — ${name}`, () => {
    it('deve executar com dry-run', () => {
      const { optsDry } = freshTmp();
      expect(() => fn('Test', optsDry)).not.toThrow();
    });
    it('deve executar com write', () => {
      const { optsWrite } = freshTmp();
      expect(() => fn('Test', optsWrite)).not.toThrow();
    });
  });
}

testGen('crud', require('../generators/crud').crud);
testGen('feature-blueprint', require('../generators/feature-blueprint').featureBlueprint);
testGen('domain-model', require('../generators/domain-model').domainModel);
testGen('usecase-pipeline', require('../generators/usecase-pipeline').usecasePipeline);
testGen('acceptance-test', require('../generators/acceptance-test').acceptanceTest);
testGen('test-matrix', require('../generators/test-matrix').testMatrix);
testGen('permission-endpoint', require('../generators/permission-endpoint').permissionEndpoint);
testGen('resource', require('../generators/resource').resource);
testGen('data-scenario', require('../generators/data-scenario').dataScenario);
testGen('seed', require('../generators/seed').seed);
testGen('integration-adapter', require('../generators/integration-adapter').integrationAdapter);
testGen('migration-plan', require('../generators/migration-plan').migrationPlan);
testGen('error-flow', require('../generators/error-flow').errorFlow);
testGen('workflow', require('../generators/workflow').workflow);
testGen('dto', require('../generators/dto').dto);
testGen('config-validator', require('../generators/config-validator').configValidator);
testGen('mock-api', require('../generators/mock-api').mockApi);
testGen('sdk', require('../generators/sdk').sdk);
testGen('multi-tenant', require('../generators/multi-tenant').multiTenant);
testGen('privacy', require('../generators/privacy').privacy);
testGen('audit-trail', require('../generators/audit-trail').auditTrail);
testGen('background-job', require('../generators/background-job').backgroundJob);
testGen('notification', require('../generators/notification').notification);
testGen('observability', require('../generators/observability').observability);
testGen('runbook', require('../generators/runbook').runbook);
testGen('ux-contract', require('../generators/ux-contract').uxContract);
testGen('analytics-event', require('../generators/analytics').analyticsEvent);
testGen('i18n', require('../generators/i18n').i18n);
testGen('example', require('../generators/example').example);
testGen('onboarding', require('../generators/onboarding').onboarding);
testGen('bug-reproduction', require('../generators/bug-reproduction').bugReproduction);
testGen('golden-path', require('../generators/golden-path').goldenPath);

describe('Generator — boilerplate-detector', () => {
  const bd = require('../generators/boilerplate-detector');
  it('boilerplateRemove deve executar', () => {
    const { optsDry } = freshTmp();
    expect(() => bd.boilerplateRemove(optsDry)).not.toThrow();
  });
});
