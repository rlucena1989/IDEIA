import { describe, it, expect } from '@jest/globals';
import { buildEvolutionPlan } from '../evolution-roadmap';
import { buildRoadmap } from '../roadmap-builder';
import { createTargetState } from '../target-state';

describe('evolution-roadmap', () => {
  it('buildEvolutionPlan should be defined', () => {
    expect(buildEvolutionPlan).toBeDefined();
  });

  it('should derive next actions from gaps', () => {
    const target = createTargetState({ name: 'Test', description: '' });
    const roadmap = buildRoadmap(target, []);
    const gaps = [{ gapId: 'g1', category: 'functional' as const, description: 'Missing: generation', severity: 'high' as const }];
    const plan = buildEvolutionPlan(roadmap, gaps);
    expect(plan.nextActions.length).toBe(1);
    expect(plan.nextActions[0]).toContain('generation');
  });
});
