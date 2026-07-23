import { describe, it, expect } from '@jest/globals';
import { planArtifacts } from '../artifact-planner';
import { ProductScope } from '../product-model';

describe('artifact-planner', () => {
  it('planArtifacts should be defined', () => {
    expect(planArtifacts).toBeDefined();
  });

  it('should plan 3 artifacts for any scope', () => {
    const scope: ProductScope = {
      productName: 'test-product',
      productType: 'cli',
      goal: 'Test',
      summary: 'A test product',
      priorities: ['high'],
      constraints: [],
    };
    const plan = planArtifacts(scope);
    expect(plan.artifacts.length).toBe(3);
    expect(plan.confidence).toBe(0.92);
  });

  it('should set first artifact as high priority', () => {
    const scope: ProductScope = {
      productName: 'test',
      productType: 'library',
      goal: '',
      summary: '',
      priorities: [],
      constraints: [],
    };
    const plan = planArtifacts(scope);
    expect(plan.artifacts[0].priority).toBe('high');
    expect(plan.artifacts[0].required).toBe(true);
  });
});
