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

describe('agentsCommand actions', () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let exitSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation();
    errorSpy = jest.spyOn(console, 'error').mockImplementation();
    exitSpy = jest.spyOn(process, 'exit').mockImplementation((() => { throw new Error('exit'); }) as () => never);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    exitSpy.mockRestore();
  });

  it('list --json deve retornar JSON', () => {
    const cmd = agentsCommand();
    cmd.parse(['node', 'test', 'list', '--json']);
    const json = JSON.parse(logSpy.mock.calls[0][0]);
    expect(Array.isArray(json)).toBe(true);
    expect(json.length).toBe(6);
  });

  it('show deve exibir agente existente', () => {
    const cmd = agentsCommand();
    cmd.parse(['node', 'test', 'show', 'engineer']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('engineer'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Sim'));
  });

  it('show deve falhar para agente inexistente', () => {
    const cmd = agentsCommand();
    expect(() => cmd.parse(['node', 'test', 'show', 'ghost'])).toThrow('exit');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('ghost'));
  });

  it('validate deve falhar quando há violações', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'agents:\n  bad:\n    name: bad\n    description: Bad\n    can_write: false\n    context_profile: general\n    read_paths: []\n    write_paths: ["src/**/*"]\n    forbidden_paths: []\n'
    );
    const cmd = agentsCommand();
    expect(() => cmd.parse(['node', 'test', 'validate'])).toThrow('exit');
    expect(errorSpy).toHaveBeenCalled();
  });

  it('sessions deve mostrar mensagem quando vazio', () => {
    const cmd = agentsCommand();
    cmd.parse(['node', 'test', 'sessions']);
    expect(logSpy).toHaveBeenCalledWith('No collaboration sessions found.');
  });

  it('conversation deve falhar para sessão inexistente', () => {
    const cmd = agentsCommand();
    expect(() => cmd.parse(['node', 'test', 'conversation', 'missing-id'])).toThrow('exit');
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('missing-id'));
  });

  it('sessions --json deve retornar array JSON', () => {
    const cmd = agentsCommand();
    cmd.parse(['node', 'test', 'sessions', '--json']);
    const json = JSON.parse(logSpy.mock.calls[0][0]);
    expect(Array.isArray(json)).toBe(true);
  });

  it('validate deve exibir sucesso para registry default', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    const cmd = agentsCommand();
    cmd.parse(['node', 'test', 'validate']);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('válidas'));
  });

  it('show com agente existente nao deve lancar erro', () => {
    const cmd = agentsCommand();
    expect(() => cmd.parse(['node', 'test', 'show', 'engineer'])).not.toThrow();
  });

  it('init deve criar registry', () => {
    const cmd = agentsCommand();
    cmd.parse(['node', 'test', 'init']);
    expect(fs.mkdirSync).toHaveBeenCalled();
    expect(fs.writeFileSync).toHaveBeenCalled();
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('inicializado'));
  });
});

describe('validateAgentPermissions - all violation types', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('detecta agente read-only com write_paths', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'agents:\n  bad:\n    name: bad\n    description: Bad\n    can_write: false\n    context_profile: general\n    read_paths: []\n    write_paths: ["src/**/*"]\n    forbidden_paths: []\n'
    );
    const result = validateAgentPermissions();
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('read-only');
  });

  it('detecta can_write com forbidden_paths **/*', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'agents:\n  bad:\n    name: bad\n    description: Bad\n    can_write: true\n    context_profile: general\n    read_paths: ["src/**/*"]\n    write_paths: ["src/**/*"]\n    forbidden_paths: ["**/*"]\n'
    );
    const result = validateAgentPermissions();
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('**/*');
  });

  it('detecta leitura global sem forbidden_paths', () => {
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readFileSync as jest.Mock).mockReturnValue(
      'agents:\n  bad:\n    name: bad\n    description: Bad\n    can_write: false\n    context_profile: general\n    read_paths: ["**/*"]\n    write_paths: []\n    forbidden_paths: []\n'
    );
    const result = validateAgentPermissions();
    expect(result.valid).toBe(false);
    expect(result.violations[0]).toContain('leitura global');
  });
});

describe('getAgent edge cases', () => {
  it('deve retornar null para string vazia', () => {
    expect(getAgent('')).toBeNull();
  });

  it('deve retornar null para nome com caracteres especiais', () => {
    expect(getAgent('invalid@agent!')).toBeNull();
  });
});
