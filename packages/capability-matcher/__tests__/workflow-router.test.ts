import { WorkflowRouter } from '../src/workflow-router';
import { SemanticNeed } from '../src/semantic-types';

describe('WorkflowRouter', () => {
  let router: WorkflowRouter;

  beforeEach(() => {
    router = new WorkflowRouter();
  });

  it('should recommend zero-to-deploy for web features', () => {
    const need: SemanticNeed = {
      description: 'implement a new feature for the web app',
      techStack: ['react'],
      domain: 'web',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'mvp',
    };
    const result = router.recommend(need);
    expect(result[0].workflowId).toBe('zero-to-deploy');
  });

  it('should recommend bugfix workflow for bug descriptions', () => {
    const need: SemanticNeed = {
      description: 'fix a critical error causing crashes',
      techStack: [],
      domain: 'web',
      complexity: 'moderate',
      teamSize: 1,
      stage: 'growth',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.workflowId === 'bugfix')).toBe(true);
  });

  it('should recommend security workflow for security tasks', () => {
    const need: SemanticNeed = {
      description: 'security vulnerability assessment and penetration testing',
      techStack: [],
      domain: 'security',
      complexity: 'complex',
      teamSize: 3,
      stage: 'mature',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.workflowId === 'security')).toBe(true);
  });

  it('should recommend deploy workflow for devops tasks', () => {
    const need: SemanticNeed = {
      description: 'set up CI/CD pipeline for canary deployment',
      techStack: ['docker'],
      domain: 'devops',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'growth',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.workflowId === 'deploy')).toBe(true);
  });

  it('should recommend migration workflow for data tasks', () => {
    const need: SemanticNeed = {
      description: 'migrate database to new schema',
      techStack: ['postgresql'],
      domain: 'data',
      complexity: 'moderate',
      teamSize: 2,
      stage: 'growth',
    };
    const result = router.recommend(need);
    expect(result.some(r => r.workflowId === 'migration')).toBe(true);
  });

  it('should fallback to zero-to-deploy when no rules match', () => {
    const need: SemanticNeed = {
      description: 'xyz unknown',
      techStack: [],
      domain: 'web',
      complexity: 'simple',
      teamSize: 1,
      stage: 'idea',
    };
    const result = router.recommend(need);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].workflowId).toBe('zero-to-deploy');
  });

  it('should return recommendations sorted by confidence descending', () => {
    const need: SemanticNeed = {
      description: 'fix a bug in the deployment pipeline security issue',
      techStack: ['docker'],
      domain: 'devops',
      complexity: 'complex',
      teamSize: 3,
      stage: 'growth',
    };
    const result = router.recommend(need);
    for (let i = 1; i < result.length; i++) {
      expect(result[i - 1].confidence).toBeGreaterThanOrEqual(result[i].confidence);
    }
  });
});
