jest.mock('../../io');

describe('Coverage Module', () => {
  it('should load all modules', () => {
    const reader = require('../coverage-reader');
    expect(reader.readCoverageReport).toBeDefined();
    expect(reader.summarizeCoverage).toBeDefined();
    expect(reader.extractFileSummaries).toBeDefined();
  });

  it('should load gap prioritizer', () => {
    const gap = require('../gap-prioritizer');
    expect(gap.GapPrioritizer).toBeDefined();
  });

  it('should load status module', () => {
    const status = require('../status');
    expect(status.buildAutonomyStatus).toBeDefined();
    expect(status.saveAutonomyStatus).toBeDefined();
    expect(status.setRootOverride).toBeDefined();
  });

  it('should load types', () => {
    const types = require('../types');
    expect(types).toBeDefined();
  });

  it('should create GapPrioritizer', () => {
    const { GapPrioritizer } = require('../gap-prioritizer');
    const p = new GapPrioritizer();
    expect(p).toBeInstanceOf(GapPrioritizer);
  });
});
