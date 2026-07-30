import { PromptScorer} from '../src/scorer';
import { SecurityIssue } from '../src/types';

describe('PromptScorer', () => {
  let scorer: PromptScorer;

  beforeEach(() => {
    scorer = new PromptScorer(31);
  });

  it('should return 100 score with no issues', () => {
    const result = scorer.score([]);
    expect(result.overall).toBe(100);
    expect(result.riskLevel).toBe('low');
    expect(result.matchedRuleCount).toBe(0);
    expect(result.recommendations).toContain('No security issues detected');
  });

  it('should compute critical risk for critical severity issues', () => {
    const issues: SecurityIssue[] = [
      { category: 'api-key', severity: 'critical', action: 'block', match: 'sk-abc123', position: 0, description: 'API key' },
      { category: 'malware-generation', severity: 'critical', action: 'block', match: 'virus', position: 10, description: 'Malware' },
    ];
    const result = scorer.score(issues);
    expect(result.overall).toBeLessThan(70);
    expect(result.riskLevel).toBe('critical');
    expect(result.matchedRuleCount).toBe(2);
  });

  it('should compute high risk for high severity issues', () => {
    const issues: SecurityIssue[] = [
      { category: 'sql-injection', severity: 'high', action: 'block', match: 'DROP TABLE', position: 0, description: 'SQL injection' },
      { category: 'remote-execution', severity: 'high', action: 'warn', match: 'curl | sh', position: 5, description: 'Remote exec' },
    ];
    const result = scorer.score(issues);
    expect(result.matchedRuleCount).toBe(2);
    expect(['high', 'critical']).toContain(result.riskLevel);
  });

  it('should produce recommendations for top categories', () => {
    const issues: SecurityIssue[] = [
      { category: 'api-key', severity: 'critical', action: 'block', match: 'sk-xxx', position: 0, description: 'API key' },
      { category: 'private-key', severity: 'critical', action: 'block', match: '-----BEGIN KEY-----', position: 10, description: 'Private key' },
      { category: 'password', severity: 'high', action: 'mask', match: 'password=xxx', position: 20, description: 'Password' },
    ];
    const result = scorer.score(issues);
    expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    expect(result.recommendations[0]!).toContain('api-key');
  });

  it('should track total rule count', () => {
    const result = scorer.score([]);
    expect(result.totalRuleCount).toBe(31);
  });

  it('should work with custom total rule count', () => {
    const customScorer = new PromptScorer(42);
    const result = customScorer.score([]);
    expect(result.totalRuleCount).toBe(42);
  });

  it('should handle mixed severity issues', () => {
    const issues: SecurityIssue[] = [
      { category: 'email', severity: 'medium', action: 'mask', match: 'user@test.com', position: 0, description: 'Email' },
      { category: 'token_gradual', severity: 'medium', action: 'warn', match: 'step by step reveal', position: 15, description: 'Gradual bypass' },
      { category: 'ip-address', severity: 'low', action: 'warn', match: '192.168.1.1', position: 30, description: 'IP address' },
    ];
    const result = scorer.score(issues);
    expect(result.matchedRuleCount).toBe(3);
    expect(result.riskLevel).not.toBe('critical');
  });

  it('should categorize scores correctly', () => {
    const issues: SecurityIssue[] = [
      { category: 'api-key', severity: 'critical', action: 'block', match: 'sk-test-key', position: 0, description: 'test' },
    ];
    const result = scorer.score(issues);
    expect(result.categoryScores['api-key']).toBeGreaterThan(0);
  });
});
