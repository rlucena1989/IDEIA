import { ContextPackRouter } from '../src/context-router';
import { SemanticNeed } from '../src/semantic-types';

describe('ContextPackRouter', () => {
  let router: ContextPackRouter;

  beforeEach(() => {
    router = new ContextPackRouter();
  });

  it('should recommend bugfix pack for bug descriptions', () => {
    const need: SemanticNeed = {
      description: 'fix a critical bug in the login page',
      techStack: ['react'],
      domain: 'web',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'growth',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.packId === 'bugfix')).toBe(true);
  });

  it('should recommend security pack for security tasks', () => {
    const need: SemanticNeed = {
      description: 'security vulnerability scan and compliance audit',
      techStack: [],
      domain: 'security',
      complexity: 'complex',
      teamSize: 3,
      stage: 'mature',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.packId === 'security-review')).toBe(true);
  });

  it('should always include ideia-introduction', () => {
    const need: SemanticNeed = {
      description: 'random project',
      techStack: [],
      domain: 'web',
      complexity: 'simple',
      teamSize: 1,
      stage: 'idea',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.packId === 'ideia-introduction')).toBe(true);
  });

  it('should include ideia-core for moderate complexity', () => {
    const need: SemanticNeed = {
      description: 'REST API with database',
      techStack: ['node'],
      domain: 'api',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'mvp',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.packId === 'ideia-core')).toBe(true);
  });

  it('should sort by priority descending', () => {
    const need: SemanticNeed = {
      description: 'fix bug with security vulnerability',
      techStack: [],
      domain: 'security',
      complexity: 'complex',
      teamSize: 2,
      stage: 'growth',
    };
    const result = router.recommend(need);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].priority).toBeGreaterThanOrEqual(result[i].priority);
    }
  });

  it('should recommend testing pack for test descriptions', () => {
    const need: SemanticNeed = {
      description: 'add unit tests and integration tests with coverage',
      techStack: [],
      domain: 'web',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'growth',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.packId === 'testing')).toBe(true);
  });

  it('should recommend deployment pack for deploy descriptions', () => {
    const need: SemanticNeed = {
      description: 'deploy to production with CI/CD pipeline',
      techStack: ['docker'],
      domain: 'devops',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'growth',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.packId === 'deployment')).toBe(true);
  });
});
