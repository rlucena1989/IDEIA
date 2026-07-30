import { finetuneCommand } from '../finetune';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();
const mockPrepare = jest.fn();
const mockExecute = jest.fn();
const mockListRuns = jest.fn();
const mockCheckAndTrain = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput }),
}));

jest.mock('@ideia/finetuning-pipeline', () => ({
  PEFTExecutor: jest.fn().mockImplementation(() => ({
    prepare: mockPrepare,
    execute: mockExecute,
    listRuns: mockListRuns,
  })),
  ContinuousFinetuning: jest.fn().mockImplementation(() => ({
    checkAndTrain: mockCheckAndTrain,
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockPrepare.mockResolvedValue({ id: 'run-001' });
  mockExecute.mockResolvedValue({
    id: 'run-001', status: 'completed',
    metrics: { perplexity: 8.5, trainLoss: [0.5234] },
    outputAdapter: 'lora-001',
  });
  mockListRuns.mockResolvedValue([
    { id: 'run-001', baseModel: 'Qwen2.5-7B', peftConfig: { method: 'qlora' }, status: 'completed', metrics: { perplexity: 8.5 } },
  ]);
  mockCheckAndTrain.mockResolvedValue({ id: 'continuous-001' });
});

describe('finetuneCommand', () => {
  it('should be defined', () => {
    expect(finetuneCommand).toBeDefined();
  });

  it('should return Command with name finetune', () => {
    const cmd = finetuneCommand();
    expect(cmd.name()).toBe('finetune');
  });

  it('should have adapt, list, status, continuous subcommands', () => {
    const cmd = finetuneCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('adapt');
    expect(names).toContain('list');
    expect(names).toContain('status');
    expect(names).toContain('continuous');
  });

  describe('adapt command', () => {
    it('should show config and return early in dry-run mode', async () => {
      const cmd = finetuneCommand();
      const adaptCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'adapt')!;
      await adaptCmd.parseAsync(['node', 'test', '--dry-run']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Dry-run')]));
      expect(mockPrepare).not.toHaveBeenCalled();
    });

    it('should prepare and execute training', async () => {
      const cmd = finetuneCommand();
      const adaptCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'adapt')!;
      await adaptCmd.parseAsync(['node', 'test', '--method', 'lora', '--rank', '8', '--base-model', 'Qwen2.5-7B']);
      expect(mockPrepare).toHaveBeenCalled();
      expect(mockExecute).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('completed')]));
    });

    it('should accept custom dataset path', async () => {
      const cmd = finetuneCommand();
      const adaptCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'adapt')!;
      await adaptCmd.parseAsync(['node', 'test', '--dataset', '/data/train.jsonl']);
      expect(mockPrepare).toHaveBeenCalled();
    });
  });

  describe('list command', () => {
    it('should list runs when available', async () => {
      const cmd = finetuneCommand();
      const listCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'list')!;
      await listCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Fine-tuning runs')]));
    });

    it('should show message when no runs exist', async () => {
      mockListRuns.mockResolvedValue([]);
      const cmd = finetuneCommand();
      const listCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'list')!;
      await listCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('No fine-tuning runs found')]));
    });
  });

  describe('status command', () => {
    it('should show run stats in table format', async () => {
      const cmd = finetuneCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Fine-tuning Status')]));
    });

    it('should show JSON output with --json flag', async () => {
      const cmd = finetuneCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ totalRuns: expect.any(Number) }));
    });
  });

  describe('continuous command', () => {
    it('should start continuous monitoring', async () => {
      const cmd = finetuneCommand();
      const contCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'continuous')!;
      await contCmd.parseAsync(['node', 'test', '--once']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Continuous Fine-tuning Monitor')]));
    });

    it('should report no training needed when drift not detected', async () => {
      mockCheckAndTrain.mockResolvedValue(null);
      const cmd = finetuneCommand();
      const contCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'continuous')!;
      await contCmd.parseAsync(['node', 'test', '--once']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('No training needed')]));
    });
  });
});
