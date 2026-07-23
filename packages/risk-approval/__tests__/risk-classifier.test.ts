import { RiskClassifier } from '../src/risk-classifier';

describe('RiskClassifier', () => {
  const c = new RiskClassifier();

  it('classifies low risk', () => {
    const r = c.classify('minor', 'rare');
    expect(r.level).toBe('low');
  });

  it('classifies critical risk', () => {
    const r = c.classify('severe', 'almost_certain');
    expect(r.level).toBe('critical');
  });

  it('adjusts risk by environment', () => {
    const dev = c.classify('major', 'unlikely', [], 'dev');
    const prod = c.classify('major', 'unlikely', [], 'production');
    expect(prod.score).toBeGreaterThanOrEqual(dev.score);
  });

  it('suggests mitigation', () => {
    const r = c.classify('severe', 'likely');
    expect(r.mitigation.length).toBeGreaterThan(0);
  });
});
