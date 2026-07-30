import { defenseReportCommand } from '../defense-report';
import { distillReportCommand } from '../distill-report';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('defenseReportCommand', () => {
  it('should be defined', () => {
    expect(defenseReportCommand).toBeDefined();
  });

  it('should return Command with name defense', () => {
    const cmd = defenseReportCommand();
    expect(cmd.name()).toBe('defense');
  });

  it('should have status, history, effectiveness subcommands', () => {
    const cmd = defenseReportCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('status');
    expect(names).toContain('history');
    expect(names).toContain('effectiveness');
  });

  describe('status command', () => {
    it('should show defense status table', async () => {
      const cmd = defenseReportCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Error Defense System')]));
    });

    it('should output JSON with --json flag', async () => {
      const cmd = defenseReportCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ defenses: expect.any(Array), totalEvents: 0 }));
    });

    it('should list 8 defense layers in JSON output', async () => {
      const cmd = defenseReportCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({
        defenses: expect.arrayContaining([
          expect.objectContaining({ name: 'SpecGate' }),
          expect.objectContaining({ name: 'ContinuousEval' }),
        ]),
      }));
    });
  });

  describe('history command', () => {
    it('should show history placeholder message', async () => {
      const cmd = defenseReportCommand();
      const histCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
      await histCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('No events recorded')]));
    });

    it('should accept limit option', async () => {
      const cmd = defenseReportCommand();
      const histCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
      await histCmd.parseAsync(['node', 'test', '--limit', '50']);
      expect(mockOutputLines).toHaveBeenCalled();
    });
  });

  describe('effectiveness command', () => {
    it('should show effectiveness table', async () => {
      const cmd = defenseReportCommand();
      const effCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'effectiveness')!;
      await effCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Defense Effectiveness')]));
    });

    it('should list all 8 layers with scores', async () => {
      const cmd = defenseReportCommand();
      const effCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'effectiveness')!;
      await effCmd.parseAsync(['node', 'test']);
      const calls = mockOutputLines.mock.calls.flat().join(' ');
      expect(calls).toContain('L1 SpecGate');
      expect(calls).toContain('L8 ContinuousEval');
      expect(calls).toContain('100%');
    });
  });
});

describe('distillReportCommand', () => {
  it('should be defined', () => {
    expect(distillReportCommand).toBeDefined();
  });

  it('should return Command with name distill', () => {
    const cmd = distillReportCommand();
    expect(cmd.name()).toBe('distill');
  });

  it('should have status, run, history, dashboard subcommands', () => {
    const cmd = distillReportCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('status');
    expect(names).toContain('run');
    expect(names).toContain('history');
    expect(names).toContain('dashboard');
  });

  describe('status command', () => {
    it('should show pipeline status as text', async () => {
      const cmd = distillReportCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Distillation Pipeline Status')]));
    });

    it('should output JSON with --json flag', async () => {
      const cmd = distillReportCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ status: 'idle', lastRun: null }));
    });
  });

  describe('run command', () => {
    it('should show distillation phases', async () => {
      const cmd = distillReportCommand();
      const runCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
      await runCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Starting distillation')]));
    });

    it('should accept custom professor and student models', async () => {
      const cmd = distillReportCommand();
      const runCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
      await runCmd.parseAsync(['node', 'test', '--professor', 'gpt-4', '--student', 'llama-3b', '--samples', '1000']);
      const calls = mockOutputLines.mock.calls.flat().join(' ');
      expect(calls).toContain('gpt-4');
      expect(calls).toContain('llama-3b');
      expect(calls).toMatch(/1[.,]000/);
    });

    it('should show all 3 phases', async () => {
      const cmd = distillReportCommand();
      const runCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
      await runCmd.parseAsync(['node', 'test']);
      const calls = mockOutputLines.mock.calls.flat().join(' ');
      expect(calls).toContain('Phase 1/3');
      expect(calls).toContain('Phase 2/3');
      expect(calls).toContain('Phase 3/3');
    });
  });

  describe('history command', () => {
    it('should show history placeholder', async () => {
      const cmd = distillReportCommand();
      const histCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
      await histCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Distillation History')]));
    });

    it('should accept limit option', async () => {
      const cmd = distillReportCommand();
      const histCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'history')!;
      await histCmd.parseAsync(['node', 'test', '--limit', '5']);
      expect(mockOutputLines).toHaveBeenCalled();
    });
  });

  describe('dashboard command', () => {
    it('should show dashboard with all sections', async () => {
      const cmd = distillReportCommand();
      const dashCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'dashboard')!;
      await dashCmd.parseAsync(['node', 'test']);
      const calls = mockOutputLines.mock.calls.flat().join(' ');
      expect(calls).toContain('Distillation Dashboard');
      expect(calls).toContain('Pipeline Status');
      expect(calls).toContain('Score History');
      expect(calls).toContain('Cost Analysis');
      expect(calls).toContain('ROI');
    });
  });
});
