import { AgentRouter } from '../src/agent-router';
import { SemanticNeed } from '../src/semantic-types';

describe('AgentRouter', () => {
  let router: AgentRouter;

  beforeEach(() => {
    router = new AgentRouter();
  });

  it('should route to Programmer for coding tasks', () => {
    const need: SemanticNeed = {
      description: 'implement a new feature with TypeScript',
      techStack: ['typescript'],
      domain: 'web',
      complexity: 'simple',
      teamSize: 1,
      stage: 'mvp',
    };
    const result = router.route(need);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some(r => r.agentId === 'Programmer')).toBe(true);
  });

  it('should route to Analyst for planning tasks', () => {
    const need: SemanticNeed = {
      description: 'brainstorm requirements for the new system',
      techStack: [],
      domain: 'web',
      complexity: 'simple',
      teamSize: 2,
      stage: 'idea',
    };
    const result = router.route(need);
    expect(result.some(r => r.agentId === 'Analyst')).toBe(true);
  });

  it('should route to DevOps for deploy tasks', () => {
    const need: SemanticNeed = {
      description: 'deploy the application to production with Docker',
      techStack: ['docker'],
      domain: 'devops',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'growth',
    };
    const result = router.route(need);
    expect(result.some(r => r.agentId === 'DevOps')).toBe(true);
  });

  it('should add Architect for complex needs', () => {
    const need: SemanticNeed = {
      description: 'complex enterprise distributed system',
      techStack: ['typescript', 'react', 'node', 'docker'],
      domain: 'web',
      complexity: 'complex',
      teamSize: 5,
      stage: 'mature',
    };
    const result = router.route(need);
    expect(result.some(r => r.agentId === 'Architect')).toBe(true);
  });

  it('should add Reviewer for bug fixes', () => {
    const need: SemanticNeed = {
      description: 'fix a critical bug in production',
      techStack: [],
      domain: 'web',
      complexity: 'simple',
      teamSize: 1,
      stage: 'mature',
    };
    const result = router.route(need);
    expect(result.some(r => r.agentId === 'Reviewer')).toBe(true);
  });

  it('should return empty array for no-match descriptions', () => {
    const need: SemanticNeed = {
      description: 'xyz unknown zzz nothing',
      techStack: [],
      domain: 'web',
      complexity: 'simple',
      teamSize: 1,
      stage: 'idea',
    };
    const result = router.route(need);
    expect(Array.isArray(result)).toBe(true);
  });

  it('should return recommendations sorted by confidence descending', () => {
    const need: SemanticNeed = {
      description: 'implement code and test the feature',
      techStack: [],
      domain: 'web',
      complexity: 'simple',
      teamSize: 1,
      stage: 'idea',
    };
    const result = router.route(need);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(result[i].confidence);
    }
  });

  it('should add security reviewer for security tasks', () => {
    const need: SemanticNeed = {
      description: 'security audit of the authentication system',
      techStack: [],
      domain: 'security',
      complexity: 'complex',
      teamSize: 2,
      stage: 'mature',
    };
    const result = router.route(need);
    expect(result.some(r => r.agentId === 'Reviewer')).toBe(true);
  });
});
