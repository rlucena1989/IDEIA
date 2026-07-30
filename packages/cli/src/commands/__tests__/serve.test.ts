import { serveCommand } from '../serve';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();
const mockDetectHardware = jest.fn();
const mockSuggestConfig = jest.fn();
const mockBenchmark = jest.fn();
const mockVLLMStart = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput, fs: { cwd: () => '/test' } }),
}));

jest.mock('@ideia/local-ai', () => ({
  InferenceAutoOptimizer: jest.fn().mockImplementation(() => ({
    detectHardware: mockDetectHardware,
    suggestConfig: mockSuggestConfig,
    benchmark: mockBenchmark,
  })),
  VLLMEngine: jest.fn().mockImplementation(() => ({ start: mockVLLMStart })),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch as any;

beforeEach(() => {
  jest.clearAllMocks();
  mockDetectHardware.mockResolvedValue({
    platform: 'linux', cpuCores: 16, totalMemoryGb: 32, freeMemoryGb: 16,
    gpuDevices: [{ name: 'NVIDIA A100', memoryGb: 80 }],
  });
  mockSuggestConfig.mockResolvedValue({
    confidence: 0.95, expectedTokensPerSecond: 120, expectedVRAMUsage: 16,
    config: {
      engine: 'vllm', quantization: { weights: 'awq', kvCache: 'fp8' },
      batching: { type: 'dynamic', maxNumSeqs: 256, maxNumBatchedTokens: 8192 },
      prefixCaching: true, chunkedPrefill: true,
      speculativeDecoding: { draftModel: 'Qwen2.5-0.5B', numSpeculativeTokens: 5 },
    },
    reasoning: ['Hardware supports vLLM with AWQ'],
  });
  mockBenchmark.mockResolvedValue([
    { config: { engine: 'vllm', quantization: { weights: 'awq' } }, tokensPerSecond: 120, ttft: 150, p50: 30, p99: 100, vramUsage: 16, totalTokens: 1000, totalTimeMs: 8000 },
  ]);
});

describe('serveCommand', () => {
  it('should be defined', () => {
    expect(serveCommand).toBeDefined();
  });

  it('should return Command with name serve', () => {
    const cmd = serveCommand();
    expect(cmd.name()).toBe('serve');
  });

  it('should have start, status, benchmark subcommands', () => {
    const cmd = serveCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('start');
    expect(names).toContain('status');
    expect(names).toContain('benchmark');
  });

  describe('start command', () => {
    it('should detect hardware and suggest config with auto-optimize in dry-run mode', async () => {
      const cmd = serveCommand();
      const startCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'start')!;
      const opts = { autoOptimize: true, dryRun: true, engine: 'auto', port: '8000', host: '127.0.0.1' };
      await startCmd.parseAsync(['node', 'test', 'Qwen2.5-7B', '--auto-optimize', '--dry-run']);
      expect(mockDetectHardware).toHaveBeenCalled();
      expect(mockSuggestConfig).toHaveBeenCalledWith(7);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('⚠ Dry run')]));
    });

    it('should start vLLM engine with proper config', async () => {
      const cmd = serveCommand();
      const startCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'start')!;
      await startCmd.parseAsync(['node', 'test', 'Qwen2.5-7B', '--auto-optimize']);
      expect(mockVLLMStart).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('✅ vLLM server is running')]));
    });

    it('should work without auto-optimize (manual config)', async () => {
      const cmd = serveCommand();
      const startCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'start')!;
      mockVLLMStart.mockResolvedValue(undefined);
      await startCmd.parseAsync(['node', 'test', 'Qwen2.5-7B', '--quantization', 'awq']);
      expect(mockVLLMStart).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('✅ Server running')]));
    });
  });

  describe('status command', () => {
    it('should show running server when fetch succeeds', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ data: [{ id: 'Qwen2.5-7B' }] }) });
      const cmd = serveCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('✅ vLLM server is running')]));
    });

    it('should show not running when fetch fails', async () => {
      mockFetch.mockRejectedValue(new Error('Connection refused'));
      const cmd = serveCommand();
      const statusCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'status')!;
      await statusCmd.parseAsync(['node', 'test']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('❌ No vLLM server running')]));
    });
  });

  describe('benchmark command', () => {
    it('should benchmark specified model', async () => {
      const cmd = serveCommand();
      const benchCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'benchmark')!;
      await benchCmd.parseAsync(['node', 'test', 'Qwen2.5-7B']);
      expect(mockSuggestConfig).toHaveBeenCalled();
      expect(mockBenchmark).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('📊 Benchmark Results')]));
    });

    it('should handle empty benchmark results', async () => {
      mockBenchmark.mockResolvedValue([]);
      const cmd = serveCommand();
      const benchCmd = cmd.commands.find((c: { name: () => string }) => c.name() === 'benchmark')!;
      await benchCmd.parseAsync(['node', 'test', 'Qwen2.5-7B']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('No benchmark results')]));
    });
  });
});
