import { describe, it, expect } from '@jest/globals';
import { planContent, detectExpectedArtifacts } from '../content-planner';
import { GenerationScope } from '../artifact-types';

describe('content-planner', () => {
  it('planContent should be defined', () => {
    expect(planContent).toBeDefined();
  });

  it('should plan artifacts from scope', () => {
    const scope: GenerationScope = {
      productName: 'test-product',
      productType: 'cli',
      goals: ['Test'],
      requiredArtifacts: ['docs/cli/commands.md', 'docs/cli/usage.md'],
    };
    const plan = planContent(scope);
    expect(plan.artifacts.length).toBe(2);
    expect(plan.scope.productName).toBe('test-product');
  });

  it('should mark first artifact as high priority', () => {
    const scope: GenerationScope = {
      productName: 'test',
      productType: 'library',
      goals: [],
      requiredArtifacts: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
    };
    const plan = planContent(scope);
    expect(plan.artifacts[0].priority).toBe('high');
    expect(plan.artifacts[1].priority).toBe('medium');
  });

  it('should detect missing artifacts for cli type', () => {
    const scope: GenerationScope = {
      productName: 'test',
      productType: 'cli',
      goals: [],
      requiredArtifacts: ['docs/cli/commands.md'],
    };
    const plan = planContent(scope);
    expect(plan.missingArtifacts.length).toBeGreaterThan(0);
  });

  it('detectExpectedArtifacts should be defined', () => {
    expect(detectExpectedArtifacts).toBeDefined();
  });
});
