import { describe, it, expect } from '@jest/globals';
import { orchestrateGeneration } from '../generation-orchestrator';
import { GenerationScope } from '../artifact-types';

describe('generation-orchestrator', () => {
  it('orchestrateGeneration should be defined', () => {
    expect(orchestrateGeneration).toBeDefined();
  });

  it('should run full pipeline from scope', () => {
    const scope: GenerationScope = {
      productName: 'test-cli',
      productType: 'cli',
      goals: ['Generate docs'],
      requiredArtifacts: ['docs/cli/commands.md'],
    };
    const result = orchestrateGeneration(scope);
    expect(result.plan).toBeDefined();
    expect(result.documents.length).toBeGreaterThan(0);
    expect(result.completeness).toBeDefined();
  });

  it('should generate documents with paths based on product name', () => {
    const scope: GenerationScope = {
      productName: 'my-app',
      productType: 'library',
      goals: [],
      requiredArtifacts: [],
    };
    const result = orchestrateGeneration(scope);
    for (const doc of result.documents) {
      expect(doc.path).toContain('my-app');
    }
  });
});
