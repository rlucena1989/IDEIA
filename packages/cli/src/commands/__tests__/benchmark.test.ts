import { benchmarkCommand } from '../benchmark';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();
const mockDetectHardware = jest.fn();
const mockSuggestConfig = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput }),
}));

jest.mock('@ideia/local-ai', () => ({
  InferenceAutoOptimizer: jest.fn().mockImplementation(() => ({
    detectHardware: mockDetectHardware,
    suggestConfig: mockSuggestConfig,
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockDetectHardware.mockResolvedValue({
    platform: 'linux', cpuCores: 16, totalMemoryGb: 32, freeMemoryGb: 16,
    gpuDevices: [{ name: 'NVIDIA A100', memoryGb: 80 }],
  });
  mockSuggestConfig.mockResolvedValue({
    expectedTokensPerSecond: 100, expectedVRAMUsage: 16,
    config: { engine: 'vllm', quantization: { weights: 'awq' } },
  });
});

describe('benchmarkCommand', () => {
  it('should be defined', () => {
    expect(benchmarkCommand).toBeDefined();
  });

  it('should return Command with name benchmark', () => {
    const cmd = benchmarkCommand();
    expect(cmd.name()).toBe('benchmark');
  });

  it('should have run and compare subcommands', () => {
    const cmd = benchmarkCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('run');
    expect(names).toContain('compare');
  });

  describe('run command', () => {
    it('should output hardware info and results', async () => {
      const cmd = benchmarkCommand();
      const runCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
      await runCmd.parseAsync(['node', 'test', '--model', 'Qwen2.5-7B']);
      expect(mockDetectHardware).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Results')]));
    });

    it('should output JSON when --json flag is passed', async () => {
      const cmd = benchmarkCommand();
      const runCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
      await runCmd.parseAsync(['node', 'test', '--model', 'Qwen2.5-7B', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ results: expect.any(Array), hardware: expect.any(Object) }));
    });

    it('should test default models when no model specified', async () => {
      const cmd = benchmarkCommand();
      const runCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'run')!;
      await runCmd.parseAsync(['node', 'test']);
      expect(mockSuggestConfig).toHaveBeenCalledTimes(2);
    });
  });

  describe('compare command', () => {
    it('should output comparison table for engine configs', async () => {
      const cmd = benchmarkCommand();
      const compareCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'compare')!;
      await compareCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Config → tok/s → VRAM')]));
    });

    it('should use provided model name', async () => {
      const cmd = benchmarkCommand();
      const compareCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'compare')!;
      await compareCmd.parseAsync(['node', 'test', '--model', 'Qwen2.5-13B']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Qwen2.5-13B')]));
    });
  });
});
