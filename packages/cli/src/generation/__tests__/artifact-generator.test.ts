import { describe, it, expect } from '@jest/globals';
import { generateArtifacts } from '../artifact-generator';
import { planContent } from '../content-planner';
import { GenerationScope } from '../artifact-types';

describe('artifact-generator', () => {
  it('generateArtifacts should be defined', () => {
    expect(generateArtifacts).toBeDefined();
  });

  it('should generate artifacts from a plan', () => {
    const scope: GenerationScope = {
      productName: 'test-product',
      productType: 'cli',
      goals: ['Test'],
      requiredArtifacts: ['docs/cli/commands.md'],
    };
    const plan = planContent(scope);
    const artifacts = generateArtifacts(plan);
    expect(artifacts.length).toBe(1);
    expect(artifacts[0].path).toBe('docs/cli/commands.md');
    expect(artifacts[0].content.length).toBeGreaterThan(50);
  });

  it('each artifact should have path, content and createdAt', () => {
    const scope: GenerationScope = {
      productName: 'test',
      productType: 'library',
      goals: [],
      requiredArtifacts: ['docs/a.md', 'docs/b.md'],
    };
    const plan = planContent(scope);
    const artifacts = generateArtifacts(plan);
    for (const artifact of artifacts) {
      expect(artifact.path).toBeDefined();
      expect(artifact.content).toBeDefined();
      expect(artifact.createdAt).toBeDefined();
    }
  });
});
