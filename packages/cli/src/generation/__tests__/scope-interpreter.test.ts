import { describe, it, expect } from '@jest/globals';
import { interpretScope } from '../scope-interpreter';
import { GenerationScope } from '../artifact-types';

describe('scope-interpreter', () => {
  it('interpretScope should be defined', () => {
    expect(interpretScope).toBeDefined();
  });

  it('should convert GenerationScope to ProductScope', () => {
    const genScope: GenerationScope = {
      productName: 'test',
      productType: 'cli',
      goals: ['Criar CLI'],
      requiredArtifacts: ['docs/cli/commands.md'],
    };
    const product = interpretScope(genScope);
    expect(product.productName).toBe('test');
    expect(product.productType).toBe('cli');
    expect(product.goal).toBe('Criar CLI');
  });

  it('should map workspace type to platform', () => {
    const genScope: GenerationScope = {
      productName: 'ws',
      productType: 'workspace',
      goals: [],
      requiredArtifacts: [],
    };
    const product = interpretScope(genScope);
    expect(product.productType).toBe('platform');
  });
});
