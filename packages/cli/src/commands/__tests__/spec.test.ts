import { specCommand } from '../spec';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();
const mockGenerate = jest.fn();
const mockLoadFromProject = jest.fn();
const mockGetAll = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput }),
}));

jest.mock('@ideia/spec-engine', () => ({
  SpecGenerator: jest.fn().mockImplementation(() => ({ generate: mockGenerate })),
  SteeringFileManager: jest.fn().mockImplementation(() => ({ loadFromProject: mockLoadFromProject })),
  HookEngine: jest.fn().mockImplementation(() => ({ getAll: mockGetAll })),
}), { virtual: true });

beforeEach(() => {
  jest.clearAllMocks();
  mockGenerate.mockReturnValue({ id: 'spec-001', title: 'Test Spec', sections: [] });
  mockLoadFromProject.mockResolvedValue([
    { path: 'STEERING.md', mode: 'replace', description: 'Project steering' },
  ]);
  mockGetAll.mockReturnValue([
    { name: 'pre-commit', description: 'Runs on commit' },
  ]);
});

describe('specCommand', () => {
  it('should be defined', () => {
    expect(specCommand).toBeDefined();
  });

  it('should return Command with name spec', () => {
    const cmd = specCommand();
    expect(cmd.name()).toBe('spec');
  });

  it('should have generate, validate, list, steering, hook subcommands', () => {
    const cmd = specCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('generate');
    expect(names).toContain('validate');
    expect(names).toContain('list');
    expect(names).toContain('steering');
    expect(names).toContain('hook');
  });

  describe('generate command', () => {
    it('should generate a spec from title', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'generate', 'Implement login']);
      expect(mockGenerate).toHaveBeenCalledWith(expect.objectContaining({ title: 'Implement login' }));
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ id: 'spec-001' }));
    });

    it('should accept custom output path', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'generate', 'My API', '--output', './specs']);
      expect(mockGenerate).toHaveBeenCalled();
    });
  });

  describe('validate command', () => {
    it('should show validation result as text', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'validate', 'spec-001']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Spec spec-001: ✅ Valid')]));
    });

    it('should output JSON with --json flag', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'validate', 'spec-001', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ specId: 'spec-001', valid: true }));
    });
  });

  describe('list command', () => {
    it('should show empty specs list as text', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'list']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('No specs found')]));
    });

    it('should output empty specs as JSON', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'list', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ specs: [] }));
    });
  });

  describe('steering command', () => {
    it('should load steering files from project', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'steering']);
      expect(mockLoadFromProject).toHaveBeenCalledWith('.');
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Loaded')]));
    });

    it('should accept custom path', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'steering', '--path', '/my/project']);
      expect(mockLoadFromProject).toHaveBeenCalledWith('/my/project');
    });
  });

  describe('hook command', () => {
    it('should list registered hooks', async () => {
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'hook']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('pre-commit')]));
    });

    it('should show message when no hooks registered', async () => {
      mockGetAll.mockReturnValue([]);
      const cmd = specCommand();
      await cmd.parseAsync(['node', 'test', 'hook']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('No hooks registered')]));
    });
  });
});
