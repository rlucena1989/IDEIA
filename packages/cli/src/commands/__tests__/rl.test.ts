import { rlCommand } from '../rl';

const mockOutputLines = jest.fn();
const mockOutput = jest.fn();
const mockVerify = jest.fn();
const mockTrainStep = jest.fn();
const mockGetStats = jest.fn();
const mockGetHistory = jest.fn();

jest.mock('../../io', () => ({
  getIO: () => ({ outputLines: mockOutputLines, output: mockOutput }),
}));

jest.mock('@ideia/agent-runtime', () => ({
  RewardVerifier: jest.fn().mockImplementation(() => ({ verify: mockVerify })),
  GRPOTrainer: jest.fn().mockImplementation(() => ({
    trainStep: mockTrainStep,
    getStats: mockGetStats,
    getHistory: mockGetHistory,
  })),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockVerify.mockResolvedValue({ correct: true, score: 1, details: 'Exact match' });
  mockTrainStep.mockResolvedValue({
    bestReward: 1, avgReward: 0.75, responses: ['x = 4', 'x = 5'], id: 'ep-001',
  });
  mockGetStats.mockReturnValue({ totalEpisodes: 5, avgReward: 0.8, bestReward: 1 });
  mockGetHistory.mockReturnValue([{ id: 'ep-001', reward: 1 }]);
});

describe('rlCommand', () => {
  it('should be defined', () => {
    expect(rlCommand).toBeDefined();
  });

  it('should return Command with name rl', () => {
    const cmd = rlCommand();
    expect(cmd.name()).toBe('rl');
  });

  it('should have train, verify, history, test-time-compute subcommands', () => {
    const cmd = rlCommand();
    const names = cmd.commands.map((c: { name: () => string }) => c.name());
    expect(names).toContain('train');
    expect(names).toContain('verify');
    expect(names).toContain('history');
    expect(names).toContain('test-time-compute');
  });

  describe('train command', () => {
    it('should show config in dry-run mode', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'train', '--dry-run']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('RL Training Config')]));
      expect(mockTrainStep).not.toHaveBeenCalled();
    });

    it('should run training step with default params', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'train']);
      expect(mockTrainStep).toHaveBeenCalled();
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Training step complete')]));
    });

    it('should accept custom algorithm and group size', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'train', '--algorithm', 'ppo', '--group-size', '16', '--reward', 'execution']);
      expect(mockTrainStep).toHaveBeenCalled();
    });
  });

  describe('verify command', () => {
    it('should verify response and show pass result', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'verify', 'x = 4', 'x = 4']);
      expect(mockVerify).toHaveBeenCalledWith('x = 4', 'x = 4');
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('✅ PASS')]));
    });

    it('should show fail result when incorrect', async () => {
      mockVerify.mockResolvedValue({ correct: false, score: 0, details: 'Mismatch' });
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'verify', 'x = 5', 'x = 4']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('❌ FAIL')]));
    });

    it('should accept custom verification type', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'verify', 'response', 'expected', '--type', 'llm-judge']);
      expect(mockVerify).toHaveBeenCalled();
    });
  });

  describe('history command', () => {
    it('should show training history summary', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'history']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('RL Training History')]));
    });

    it('should output JSON with --json flag', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'history', '--json']);
      expect(mockOutput).toHaveBeenCalledWith(expect.objectContaining({ stats: expect.any(Object), history: expect.any(Array) }));
    });
  });

  describe('test-time-compute command', () => {
    it('should show compute config', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'test-time-compute']);
      expect(mockOutputLines).toHaveBeenCalledWith(expect.arrayContaining([expect.stringContaining('Test-Time Compute Config')]));
    });

    it('should accept custom budget, strategy, and samples', async () => {
      const cmd = rlCommand();
      await cmd.parseAsync(['node', 'test', 'test-time-compute', '--budget', '8192', '--strategy', 'search', '--samples', '5']);
      const calls = mockOutputLines.mock.calls.flat().join(' ');
      expect(calls).toContain('Budget:');
      expect(calls).toMatch(/8,?\.?192/);
      expect(calls).toContain('search');
      expect(calls).toContain('5');
    });
  });
});
