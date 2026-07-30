import { InitiativeFeedback, createInitiativeFeedback } from '../src/initiative-feedback';

describe('InitiativeFeedback', () => {
  it('creates with default dependencies', () => {
    const feedback = new InitiativeFeedback();
    expect(feedback).toBeInstanceOf(InitiativeFeedback);
  });

  it('createInitiativeFeedback factory works', () => {
    const feedback = createInitiativeFeedback();
    expect(feedback).toBeInstanceOf(InitiativeFeedback);
  });

  it('setConfig updates configuration', () => {
    const feedback = new InitiativeFeedback();
    feedback.setConfig({ autoSubmitFixResults: false, generateRecommendations: false });
    const config = feedback.getConfig();
    expect(config.autoSubmitFixResults).toBe(false);
    expect(config.generateRecommendations).toBe(false);
  });

  it('getConfig returns current configuration', () => {
    const feedback = new InitiativeFeedback();
    const config = feedback.getConfig();
    expect(config.maxResultsPerCycle).toBe(100);
    expect(config.eventBusEnabled).toBe(true);
  });

  it('getPipeline returns the feedback pipeline', () => {
    const feedback = new InitiativeFeedback();
    expect(feedback.getPipeline()).toBeDefined();
  });

  it('getOracle returns the correction oracle', () => {
    const feedback = new InitiativeFeedback();
    expect(feedback.getOracle()).toBeDefined();
  });

  it('getLastCycle returns undefined when no cycles', () => {
    const feedback = new InitiativeFeedback();
    expect(feedback.getLastCycle()).toBeUndefined();
  });

  it('getAllCycles returns empty array when no cycles', () => {
    const feedback = new InitiativeFeedback();
    expect(feedback.getAllCycles()).toEqual([]);
  });

  it('getStats returns zeros when no cycles', () => {
    const feedback = new InitiativeFeedback();
    const stats = feedback.getStats();
    expect(stats.totalCycles).toBe(0);
    expect(stats.totalScanned).toBe(0);
  });

  it('runCycle scans a directory and returns results', async () => {
    const feedback = new InitiativeFeedback();
    const result = await feedback.runCycle(process.cwd(), ['node_modules']);
    expect(result.scanned).toBeDefined();
    expect(typeof result.durationMs).toBe('number');
    expect(result.timestamp).toBeDefined();
  });

  it('getLastCycle returns data after a cycle', async () => {
    const feedback = new InitiativeFeedback();
    await feedback.runCycle(process.cwd(), ['node_modules']);
    const last = feedback.getLastCycle();
    expect(last).toBeDefined();
    expect(last!.scanned).toBeGreaterThanOrEqual(0);
  });

  it('getAllCycles returns cycles after run', async () => {
    const feedback = new InitiativeFeedback();
    await feedback.runCycle(process.cwd(), ['node_modules']);
    expect(feedback.getAllCycles().length).toBe(1);
  });
});
