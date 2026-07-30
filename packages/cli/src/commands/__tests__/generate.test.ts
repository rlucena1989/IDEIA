import { Command } from 'commander';
import { generateCommand } from '../generate';
import * as fs from 'node:fs';
import * as path from 'node:path';

jest.mock('node:fs');
jest.mock('node:path');
jest.mock('../../generators/feature-blueprint');
jest.mock('../../generators/domain-model');
jest.mock('../../generators/usecase-pipeline');
jest.mock('../../generators/acceptance-test');
jest.mock('../../generators/test-matrix');
jest.mock('../../generators/permission-endpoint');
jest.mock('../../generators/crud');
jest.mock('../../generators/resource');
jest.mock('../../generators/data-scenario');
jest.mock('../../generators/seed');
jest.mock('../../generators/boilerplate-detector');
jest.mock('../../generators/integration-adapter');
jest.mock('../../generators/migration-plan');
jest.mock('../../generators/error-flow');
jest.mock('../../generators/workflow');
jest.mock('../../generators/dto');
jest.mock('../../generators/config-validator');
jest.mock('../../generators/mock-api');
jest.mock('../../generators/sdk');
jest.mock('../../generators/multi-tenant');
jest.mock('../../generators/privacy');
jest.mock('../../generators/audit-trail');
jest.mock('../../generators/background-job');
jest.mock('../../generators/notification');
jest.mock('../../generators/observability');
jest.mock('../../generators/runbook');
jest.mock('../../generators/ux-contract');
jest.mock('../../generators/analytics');
jest.mock('../../generators/i18n');
jest.mock('../../generators/example');
jest.mock('../../generators/onboarding');
jest.mock('../../generators/bug-reproduction');
jest.mock('../../generators/golden-path');
jest.mock('../../generation/generation-context');
jest.mock('../../generation/generation-orchestrator');

describe('generateCommand', () => {
  let cmd: Command;
  let mockExit: jest.SpyInstance;

  beforeAll(() => {
    mockExit = jest.spyOn(process, 'exit').mockImplementation(() => undefined as never);
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    cmd = generateCommand();
  });

  it('should create a command with name "generate"', () => {
    expect(cmd.name()).toBe('generate');
    expect(cmd.description()).toContain('code artifacts');
  });

  it('should have a subcommand named "feature-blueprint"', () => {
    const sub = cmd.commands.find(c => c.name() === 'feature-blueprint');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('feature blueprint');
  });

  it('should have a subcommand named "crud"', () => {
    const sub = cmd.commands.find(c => c.name() === 'crud');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('CRUD');
  });

  it('should have a subcommand named "product"', () => {
    const sub = cmd.commands.find(c => c.name() === 'product');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('produto');
  });

  it('should have a subcommand named "demand"', () => {
    const sub = cmd.commands.find(c => c.name() === 'demand');
    expect(sub).toBeDefined();
    expect(sub?.description()).toContain('demanda');
  });

  it('should have enterprise subcommands (sdk, multi-tenant, privacy, audit-trail, etc.)', () => {
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('sdk');
    expect(names).toContain('multi-tenant');
    expect(names).toContain('privacy');
    expect(names).toContain('audit-trail');
    expect(names).toContain('background-job');
    expect(names).toContain('notification');
    expect(names).toContain('observability');
    expect(names).toContain('runbook');
  });

  it('should have UX subcommands (ux-contract, analytics-event, i18n, example)', () => {
    const names = cmd.commands.map(c => c.name());
    expect(names).toContain('ux-contract');
    expect(names).toContain('analytics-event');
    expect(names).toContain('i18n');
    expect(names).toContain('example');
  });

  it('should have at least 30 subcommands', () => {
    expect(cmd.commands.length).toBeGreaterThanOrEqual(30);
  });

  it('should handle "product" command with --json flag', () => {
    const sub = cmd.commands.find(c => c.name() === 'product')!;
    const opt = sub.options.find(o => o.attributeName() === 'json');
    expect(opt).toBeDefined();
  });

  it('should have "resource" subcommand with --stack option', () => {
    const sub = cmd.commands.find(c => c.name() === 'resource');
    expect(sub).toBeDefined();
    const opt = sub?.options.find(o => o.attributeName() === 'stack');
    expect(opt).toBeDefined();
  });

  it('should have "product" command with action that calls orchestrateGeneration', async () => {
    const orchestrateGeneration = require('../../generation/generation-orchestrator').orchestrateGeneration;
    orchestrateGeneration.mockReturnValue({
      plan: { scope: { productName: 'Test', productType: 'cli' }, artifacts: [] },
      documents: [],
      completeness: { ok: true, missing: [], insufficient: [] },
    });

    const scopeContent = JSON.stringify({
      productName: 'Test',
      productType: 'cli',
      goals: [],
      requiredArtifacts: [],
    });
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(scopeContent);

    const sub = cmd.commands.find(c => c.name() === 'product')!;
    await sub.parseAsync(['node', 'test', 'test-scope.json', '--json']);

    expect(orchestrateGeneration).toHaveBeenCalled();
  });

  it('should handle "product" command when scope file does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);

    const sub = cmd.commands.find(c => c.name() === 'product')!;
    await sub.parseAsync(['node', 'test', 'nonexistent.json']);

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle "product" command with invalid JSON', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('invalid json');

    const sub = cmd.commands.find(c => c.name() === 'product')!;
    await sub.parseAsync(['node', 'test', 'bad.json']);

    expect(mockExit).toHaveBeenCalledWith(1);
  });

  it('should handle "demand" command', async () => {
    const runDemandGeneration = require('../../generation/generation-context').runDemandGeneration;
    runDemandGeneration.mockReturnValue({
      plan: { scope: { productName: 'Test', productType: 'cli' }, artifacts: [] },
      artifacts: [],
      validation: { ok: true, issues: [] },
    });

    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(JSON.stringify({
      productName: 'Test', productType: 'cli', goals: [], requiredArtifacts: [],
    }));

    const sub = cmd.commands.find(c => c.name() === 'demand')!;
    await sub.parseAsync(['node', 'test', 'test-scope.json']);

    expect(runDemandGeneration).toHaveBeenCalled();
  });

  it('should have adapter-related options (--lang, --spec, --out)', () => {
    const langOpt = cmd.options.find(o => o.attributeName() === 'lang');
    const specOpt = cmd.options.find(o => o.attributeName() === 'spec');
    const outOpt = cmd.options.find(o => o.attributeName() === 'out');
    expect(langOpt).toBeDefined();
    expect(specOpt).toBeDefined();
    expect(outOpt).toBeDefined();
  });
});
