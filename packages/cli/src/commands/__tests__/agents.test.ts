import { listAgents, getAgent, validateAgentPermissions, initRegistry, agentsCommand } from '../agents';
import type { AgentDefinition, AgentRegistry } from '../agents';
import fs from 'node:fs';

jest.mock('node:fs');

const _mockDefaultAgents = () => {
  const { getDefaultRegistry } = jest.requireActual('../agents');
  return getDefaultRegistry();
};

beforeEach(() => {
  jest.clearAllMocks();
  (fs.existsSync as jest.Mock).mockReturnValue(false);
});

describe('listAgents', () => {
  it('deve retornar agentes default quando registry nao existe', () => {
    const agents = listAgents();
    expect(agents).toHaveLength(6);
    expect(agents.map(a => a.name)).toEqual(expect.arrayContaining(['planner', 'engineer', 'qa', 'reviewer', 'security', 'docs']));
  });

  it('deve carregar agentes do registry quando arquivo existe', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'agents:\n  custom:\n    name: custom\n    description: Custom agent\n    can_write: true\n    context_profile: general\n    read_paths: ["src/**/*"]\n    write_paths: ["src/**/*"]\n    forbidden_paths: []\n'
    );
    const agents = listAgents();
    expect(agents).toHaveLength(1);
    expect(agents[0].name).toBe('custom');
  });

  it('deve retornar default quando YAML for invalido', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue('not: valid: yaml: [[[');
    const agents = listAgents();
    expect(agents).toHaveLength(6);
  });
});

describe('getAgent', () => {
  it('deve retornar agente existente por nome', () => {
    const agent = getAgent('engineer');
    expect(agent).not.toBeNull();
    expect(agent!.name).toBe('engineer');
    expect(agent!.can_write).toBe(true);
  });

  it('deve retornar null para agente inexistente', () => {
    const agent = getAgent('nonexistent');
    expect(agent).toBeNull();
  });
});

describe('validateAgentPermissions', () => {
  it('deve retornar valido para registry default', () => {
    const result = validateAgentPermissions();
    expect(result.valid).toBe(true);
    expect(result.violations).toHaveLength(0);
  });

  it('deve detectar read-only com write_paths', () => {
    const _registryPath = require('../agents').getRegistryPath;
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'version: "1.0.0"\nagents:\n  bad_agent:\n    name: bad_agent\n    description: Bad\n    can_write: false\n    context_profile: general\n    read_paths: []\n    write_paths: ["src/**/*"]\n    forbidden_paths: []\n'
    );
    const result = validateAgentPermissions();
    expect(result.valid).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.violations[0]).toContain('read-only');
  });

  it('deve detectar can_write com forbidden_paths **/*', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'version: "1.0.0"\nagents:\n  bad_agent:\n    name: bad_agent\n    description: Bad\n    can_write: true\n    context_profile: general\n    read_paths: ["src/**/*"]\n    write_paths: ["src/**/*"]\n    forbidden_paths: ["**/*"]\n'
    );
    const result = validateAgentPermissions();
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('**/*');
  });
});

describe('initRegistry', () => {
  it('deve criar diretorio e salvar registry', () => {
    initRegistry();
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
    const writeCall = (fs.writeFileSync as jest.Mock).mock.calls[0];
    const content = writeCall[1] as string;
    expect(content).toContain('planner');
    expect(content).toContain('engineer');
    expect(content).toContain('version: 1.0.0');
  });
});

describe('agentsCommand', () => {
  it('should be defined', () => {
    expect(agentsCommand).toBeDefined();
  });

  it('should return a Command object with subcommands', () => {
    const cmd = agentsCommand();
    expect(cmd.name()).toBe('agents');
    const subcommands = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(subcommands).toContain('list');
    expect(subcommands).toContain('validate');
    expect(subcommands).toContain('init');
    expect(subcommands).toContain('show');
    expect(subcommands).toContain('run');
    expect(subcommands).toContain('sessions');
    expect(subcommands).toContain('conversation');
  });
});
