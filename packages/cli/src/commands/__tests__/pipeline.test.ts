import { pipelineCommand } from '../pipeline';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('pipelineCommand', () => {
  it('should be defined', () => {
    expect(pipelineCommand).toBeDefined();
  });

  it('should return Command with name pipeline', () => {
    const cmd = pipelineCommand();
    expect(cmd.name()).toBe('pipeline');
  });

  it('should have run, status, dashboard subcommands', () => {
    const cmd = pipelineCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('run');
    expect(names).toContain('status');
    expect(names).toContain('dashboard');
  });

  describe('run command', () => {
    it('should show pipeline phases and complete message', async () => {
      const cmd = pipelineCommand();
      await cmd.parseAsync(['node', 'test', 'run', 'spec-123']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Pipeline: spec-123')]));
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('✅ Pipeline completed')]));
    });

    it('should show dry-run message when --dry-run is passed', async () => {
      const cmd = pipelineCommand();
      await cmd.parseAsync(['node', 'test', 'run', 'spec-123', '--dry-run']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('⚠ Dry run')]));
    });

    it('should list all 7 phases', async () => {
      const cmd = pipelineCommand();
      await cmd.parseAsync(['node', 'test', 'run', 'spec-abc']);
      const calls = mockOutputLines.mock.calls.flat().join(' ');
      expect(calls).toContain('Phase 1/7');
      expect(calls).toContain('Phase 7/7');
    });
  });

  describe('status command', () => {
    it('should show pipeline status with zeros', async () => {
      const cmd = pipelineCommand();
      await cmd.parseAsync(['node', 'test', 'status']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Pipeline Status')]));
    });
  });

  describe('dashboard command', () => {
    it('should show dashboard with all sections', async () => {
      const cmd = pipelineCommand();
      await cmd.parseAsync(['node', 'test', 'dashboard']);
      const calls = mockOutputLines.mock.calls.flat().join(' ');
      expect(calls).toContain('Pipeline Dashboard');
      expect(calls).toContain('Active Pipelines');
      expect(calls).toContain('Quality Gates');
      expect(calls).toContain('Recent Runs');
    });
  });
});
