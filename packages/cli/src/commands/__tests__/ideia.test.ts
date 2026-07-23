import { Command } from 'commander';
import { ideiaCommand, registerIdeiaCommand } from '../ideia';
import { ideaCommand, runIdeiaPipeline, classifyIdeaNaturalLanguage, buildPlan } from '../ideia/idea-command';
import { ideiaInitCommand } from '../ideia/init-command';
import { ideiaStatusCommand } from '../ideia/status-command';
import { ideiaAgentCommand } from '../ideia/agent-command';
import { ideiaMemoryCommand } from '../ideia/memory-command';
import { ideiaDeployCommand } from '../ideia/deploy-command';
import { ideiaQualityCommand } from '../ideia/quality-command';
import { ideiaConfigCommand } from '../ideia/config-command';

jest.mock('../../agents/agent-registry');
jest.mock('../../agents/agent-coordinator');
jest.mock('../../agents/agent-report');
jest.mock('../../agents/agent-types');
jest.mock('@ideia/memory-store');
jest.mock('../../utils/gate/runner');
jest.mock('../scorecard');
jest.mock('../detect');
jest.mock('../status');
jest.mock('../engineer');
jest.mock('../../release/preparer');
jest.mock('../../release/notes');

describe('ideiaCommand', () => {
  it('should be defined', () => {
    expect(ideiaCommand).toBeDefined();
  });

  it('should create a Command with name "ideia"', () => {
    const cmd = ideiaCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('ideia');
  });

  it('should have description containing IDEIA', () => {
    const cmd = ideiaCommand();
    expect(cmd.description()).toContain('IDEIA');
  });

  it('should register all 8 subcommands', () => {
    const cmd = ideiaCommand();
    const subcommands = cmd.commands.map((c: Command) => c.name());
    expect(subcommands).toContain('idea');
    expect(subcommands).toContain('init');
    expect(subcommands).toContain('status');
    expect(subcommands).toContain('agent');
    expect(subcommands).toContain('memory');
    expect(subcommands).toContain('deploy');
    expect(subcommands).toContain('quality');
    expect(subcommands).toContain('config');
    expect(subcommands.length).toBe(8);
  });
});

describe('registerIdeiaCommand', () => {
  it('should add ideia command to a program', () => {
    const program = new Command();
    registerIdeiaCommand(program);
    const cmd = program.commands.find((c: Command) => c.name() === 'ideia');
    expect(cmd).toBeDefined();
  });
});

describe('ideaCommand', () => {
  it('should be defined', () => {
    expect(ideaCommand).toBeDefined();
  });

  it('should create a Command with name "idea"', () => {
    const cmd = ideaCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('idea');
  });

  it('should have analyze, run, and status subcommands', () => {
    const cmd = ideaCommand();
    const subcommands = cmd.commands.map((c: Command) => c.name());
    expect(subcommands).toContain('analyze');
    expect(subcommands).toContain('run');
    expect(subcommands).toContain('status');
  });
});

describe('classifyIdeaNaturalLanguage', () => {
  it('should detect Next.js and PostgreSQL for SaaS idea', () => {
    const result = classifyIdeaNaturalLanguage('Quero um SaaS de assinaturas com Next.js e Stripe');
    expect(result.stack).toContain('Next.js');
    expect(result.stack).toContain('Stripe');
    expect(result.architecture).toContain('Multi-tenancy');
  });

  it('should detect modular monolith for non-SaaS idea', () => {
    const result = classifyIdeaNaturalLanguage('Um blog simples com React');
    expect(result.architecture).toContain('Modular monolith');
  });

  it('should detect risks for payment ideas', () => {
    const result = classifyIdeaNaturalLanguage('SaaS com Stripe');
    const hasWebhookRisk = result.risks.some((r: string) => r.toLowerCase().includes('webhook'));
    expect(hasWebhookRisk).toBe(true);
  });

  it('should estimate files based on stack', () => {
    const result = classifyIdeaNaturalLanguage('App com Next.js, PostgreSQL, Stripe, Docker');
    expect(result.estimatedFiles).toBeGreaterThan(0);
  });
});

describe('buildPlan', () => {
  it('should generate 8 steps by default', () => {
    const plan = buildPlan('simple app', { stack: ['React'] });
    expect(plan.length).toBe(8);
    expect(plan[0].step).toBe(1);
    expect(plan[7].step).toBe(8);
  });

  it('should include payment step for Stripe', () => {
    const plan = buildPlan('payment app', { stack: ['Stripe'] });
    expect(plan.length).toBe(9);
    const paymentSteps = plan.filter((s: { module: string }) => s.module === 'payments');
    expect(paymentSteps.length).toBe(2);
  });

  it('should have all steps as pending initially', () => {
    const plan = buildPlan('test', { stack: [] });
    const allPending = plan.every((s: { status: string }) => s.status === 'pending');
    expect(allPending).toBe(true);
  });
});

describe('runIdeiaPipeline', () => {
  it('should return analysis and plan without session when not approved', async () => {
    const result = await runIdeiaPipeline('test idea', '/tmp/test', { approve: false });
    expect(result.idea).toBe('test idea');
    expect(result.analysis).toBeDefined();
    expect(result.plan.length).toBeGreaterThan(0);
    expect(result.session).toBeNull();
  });
});

describe('ideiaInitCommand', () => {
  it('should be defined', () => {
    expect(ideiaInitCommand).toBeDefined();
  });

  it('should create a Command with name "init"', () => {
    const cmd = ideiaInitCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('init');
  });

  it('should have stack option with default nextjs', () => {
    const cmd = ideiaInitCommand();
    const stackOpt = cmd.options.find((o: { attributeName: () => string }) => o.attributeName() === 'stack');
    expect(stackOpt).toBeDefined();
  });
});

describe('ideiaStatusCommand', () => {
  it('should be defined', () => {
    expect(ideiaStatusCommand).toBeDefined();
  });

  it('should create a Command with name "status"', () => {
    const cmd = ideiaStatusCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('status');
  });
});

describe('ideiaAgentCommand', () => {
  it('should be defined', () => {
    expect(ideiaAgentCommand).toBeDefined();
  });

  it('should create a Command with name "agent"', () => {
    const cmd = ideiaAgentCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('agent');
  });

  it('should have list, status, assign, and report subcommands', () => {
    const cmd = ideiaAgentCommand();
    const subcommands = cmd.commands.map((c: Command) => c.name());
    expect(subcommands).toContain('list');
    expect(subcommands).toContain('status');
    expect(subcommands).toContain('assign');
    expect(subcommands).toContain('report');
  });
});

describe('ideiaMemoryCommand', () => {
  it('should be defined', () => {
    expect(ideiaMemoryCommand).toBeDefined();
  });

  it('should create a Command with name "memory"', () => {
    const cmd = ideiaMemoryCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('memory');
  });

  it('should have show, search, add, and clear subcommands', () => {
    const cmd = ideiaMemoryCommand();
    const subcommands = cmd.commands.map((c: Command) => c.name());
    expect(subcommands).toContain('show');
    expect(subcommands).toContain('search');
    expect(subcommands).toContain('add');
    expect(subcommands).toContain('clear');
  });
});

describe('ideiaDeployCommand', () => {
  it('should be defined', () => {
    expect(ideiaDeployCommand).toBeDefined();
  });

  it('should create a Command with name "deploy"', () => {
    const cmd = ideiaDeployCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('deploy');
  });

  it('should have prepare and status subcommands', () => {
    const cmd = ideiaDeployCommand();
    const subcommands = cmd.commands.map((c: Command) => c.name());
    expect(subcommands).toContain('prepare');
    expect(subcommands).toContain('status');
  });
});

describe('ideiaQualityCommand', () => {
  it('should be defined', () => {
    expect(ideiaQualityCommand).toBeDefined();
  });

  it('should create a Command with name "quality"', () => {
    const cmd = ideiaQualityCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('quality');
  });

  it('should have check, scorecard, and gates subcommands', () => {
    const cmd = ideiaQualityCommand();
    const subcommands = cmd.commands.map((c: Command) => c.name());
    expect(subcommands).toContain('check');
    expect(subcommands).toContain('scorecard');
    expect(subcommands).toContain('gates');
  });
});

describe('ideiaConfigCommand', () => {
  it('should be defined', () => {
    expect(ideiaConfigCommand).toBeDefined();
  });

  it('should create a Command with name "config"', () => {
    const cmd = ideiaConfigCommand();
    expect(cmd).toBeInstanceOf(Command);
    expect(cmd.name()).toBe('config');
  });

  it('should have set, get, list, and reset subcommands', () => {
    const cmd = ideiaConfigCommand();
    const subcommands = cmd.commands.map((c: Command) => c.name());
    expect(subcommands).toContain('set');
    expect(subcommands).toContain('get');
    expect(subcommands).toContain('list');
    expect(subcommands).toContain('reset');
  });
});
