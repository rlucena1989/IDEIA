import { KEYWORD_TO_CAPABILITY, TECHNOLOGY_TO_AGENT, DOMAIN_TO_WORKFLOW, COMPLEXITY_TO_CONTEXT_DEPTH, AUTO_INCLUSION_RULES } from '../src/rules';

describe('Rules constants', () => {
  it('KEYWORD_TO_CAPABILITY maps authentication to capabilities', () => {
    const caps = KEYWORD_TO_CAPABILITY['authentication'];
    expect(caps).toBeDefined();
    expect(caps.length).toBeGreaterThan(0);
    expect(caps).toContain('auth-service');
  });

  it('KEYWORD_TO_CAPABILITY has all required keys', () => {
    const keys = Object.keys(KEYWORD_TO_CAPABILITY);
    expect(keys).toContain('api');
    expect(keys).toContain('database');
    expect(keys).toContain('deploy');
    expect(keys).toContain('security');
    expect(keys).toContain('testing');
  });

  it('TECHNOLOGY_TO_AGENT maps typescript to Programmer', () => {
    expect(TECHNOLOGY_TO_AGENT['typescript']).toBe('Programmer');
  });

  it('TECHNOLOGY_TO_AGENT maps docker to DevOps', () => {
    expect(TECHNOLOGY_TO_AGENT['docker']).toBe('DevOps');
  });

  it('TECHNOLOGY_TO_AGENT maps eslint to Reviewer', () => {
    expect(TECHNOLOGY_TO_AGENT['eslint']).toBe('Reviewer');
  });

  it('DOMAIN_TO_WORKFLOW maps web to zero-to-deploy', () => {
    expect(DOMAIN_TO_WORKFLOW['web']).toBe('zero-to-deploy');
  });

  it('DOMAIN_TO_WORKFLOW maps security to security', () => {
    expect(DOMAIN_TO_WORKFLOW['security']).toBe('security');
  });

  it('COMPLEXITY_TO_CONTEXT_DEPTH maps correctly', () => {
    expect(COMPLEXITY_TO_CONTEXT_DEPTH['simple']).toBe(1);
    expect(COMPLEXITY_TO_CONTEXT_DEPTH['complex']).toBe(3);
  });

  it('AUTO_INCLUSION_RULES contains core rules', () => {
    expect(AUTO_INCLUSION_RULES).toContain('ideia-introduction');
    expect(AUTO_INCLUSION_RULES).toContain('ideia-core');
  });
});
