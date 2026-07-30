import { quantizeCommand } from '../quantize';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();
const mockEstimate = jest.fn();
const mockQuantize = jest.fn();
const mockBenchmark = jest.fn();
const mockGetRecommendedForVRAM = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput }),
}));

jest.mock('@ideia/local-ai', () => ({
  QuantizationEngine: jest.fn().mockImplementation(() => ({
    estimate: mockEstimate,
    quantize: mockQuantize,
    benchmark: mockBenchmark,
  })),
  MoERouter: jest.fn().mockImplementation(() => ({
    getRecommendedForVRAM: mockGetRecommendedForVRAM,
  })),
  KNOWN_MOE_MODELS: [{ id: 'test-moe', totalParams: 47, activeParams: 12, numExperts: 8 }],
}));

jest.mock('fs/promises', () => ({
  stat: jest.fn().mockResolvedValue({ size: 10_000_000_000 }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockEstimate.mockResolvedValue({ compressedSize: 2_500_000_000, ratio: 4, quality: 0.85 });
  mockQuantize.mockResolvedValue({
    outputPath: '.ai/quantized/model', originalSizeBytes: 10_000_000_000,
    compressedSizeBytes: 2_500_000_000, compressionRatio: 4, qualityScore: 0.85, quantizationTimeMs: 120000,
  });
  mockBenchmark.mockResolvedValue([
    { method: 'awq', compressionRatio: 4, qualityScore: 0.85, compressedSizeBytes: 2_500_000_000 },
    { method: 'gptq', compressionRatio: 3.5, qualityScore: 0.80, compressedSizeBytes: 2_800_000_000 },
  ]);
  mockGetRecommendedForVRAM.mockReturnValue([
    { id: 'mixtral-8x7b', totalParams: 47, activeParams: 12, numExperts: 8 },
  ]);
});

describe('quantizeCommand', () => {
  it('should be defined', () => {
    expect(quantizeCommand).toBeDefined();
  });

  it('should return Command with name quantize', () => {
    const cmd = quantizeCommand();
    expect(cmd.name()).toBe('quantize');
  });

  it('should have compress, benchmark, estimate, moe-list subcommands', () => {
    const cmd = quantizeCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('compress');
    expect(names).toContain('benchmark');
    expect(names).toContain('estimate');
    expect(names).toContain('moe-list');
  });

  describe('compress command', () => {
    it('should show estimate in dry-run mode', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'compress', '/models/model.bin', '--dry-run']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Estimate')]));
    });

    it('should run quantization and show results', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'compress', '/models/model.bin']);
      expect(mockQuantize).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('✅ Quantization complete')]));
    });

    it('should accept custom method and bits', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'compress', '/models/model.bin', '--method', 'gptq', '--bits', '8']);
      expect(mockQuantize).toHaveBeenCalled();
    });

    it('should accept calibration dataset path', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'compress', '/models/model.bin', '--calibration-dataset', '/data/calib.jsonl']);
      expect(mockQuantize).toHaveBeenCalled();
    });
  });

  describe('benchmark command', () => {
    it('should compare quantization methods', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'benchmark', '/models/model.bin']);
      expect(mockBenchmark).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Method')]));
    });
  });

  describe('estimate command', () => {
    it('should estimate compression for given size', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'estimate', '7']);
      expect(mockEstimate).toHaveBeenCalledTimes(5);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Estimates for 7GB model')]));
    });
  });

  describe('moe-list command', () => {
    it('should list MoE models', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'moe-list']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('MoE Models')]));
    });

    it('should filter by VRAM when specified', async () => {
      const cmd = quantizeCommand();
      await cmd.parseAsync(['node', 'test', 'moe-list', '--vram', '48']);
      expect(mockGetRecommendedForVRAM).toHaveBeenCalledWith(48);
    });
  });
});
