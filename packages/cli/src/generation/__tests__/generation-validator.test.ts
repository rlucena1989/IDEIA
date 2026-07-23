import { describe, it, expect } from '@jest/globals';
import { validateGeneration } from '../generation-validator';
import { GenerationPlan, GenerationScope } from '../artifact-types';

describe('generation-validator', () => {
  it('validateGeneration should be defined', () => {
    expect(validateGeneration).toBeDefined();
  });

  it('should pass for complete generation', () => {
    const scope: GenerationScope = {
      productName: 'test',
      productType: 'cli',
      goals: [],
      requiredArtifacts: ['docs/a.md'],
    };
    const plan: GenerationPlan = {
      scope,
      artifacts: [{ path: 'docs/a.md', title: 'A', sections: ['Resumo'], priority: 'high', generated: true }],
      missingArtifacts: [],
    };
    const artifacts = [{ path: 'docs/a.md', content: 'Conteúdo com mais de 50 caracteres para passar na validação de tamanho mínimo.', createdAt: new Date().toISOString() }];
    const result = validateGeneration(plan, artifacts);
    expect(result.ok).toBe(true);
    expect(result.issues.length).toBe(0);
  });

  it('should report missing artifacts', () => {
    const scope: GenerationScope = {
      productName: 'test',
      productType: 'cli',
      goals: [],
      requiredArtifacts: ['docs/a.md', 'docs/b.md'],
    };
    const plan: GenerationPlan = {
      scope,
      artifacts: [{ path: 'docs/a.md', title: 'A', sections: [], priority: 'high', generated: true }],
      missingArtifacts: ['docs/b.md'],
    };
    const artifacts = [{ path: 'docs/a.md', content: 'Conteúdo válido com mais de 50 caracteres para teste.', createdAt: new Date().toISOString() }];
    const result = validateGeneration(plan, artifacts);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.includes('docs/b.md'))).toBe(true);
  });

  it('should report insufficient content', () => {
    const scope: GenerationScope = {
      productName: 'test',
      productType: 'cli',
      goals: [],
      requiredArtifacts: ['docs/short.md'],
    };
    const plan: GenerationPlan = {
      scope,
      artifacts: [{ path: 'docs/short.md', title: 'Short', sections: [], priority: 'high', generated: true }],
      missingArtifacts: [],
    };
    const artifacts = [{ path: 'docs/short.md', content: 'Curto.', createdAt: new Date().toISOString() }];
    const result = validateGeneration(plan, artifacts);
    expect(result.ok).toBe(false);
    expect(result.issues.some(i => i.includes('Conteúdo insuficiente'))).toBe(true);
  });
});
