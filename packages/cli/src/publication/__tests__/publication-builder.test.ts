import { describe, it, expect } from '@jest/globals';
import { buildPublicationPlan } from '../publication-builder';

describe('publication-builder', () => {
  it('buildPublicationPlan should be defined', () => {
    expect(buildPublicationPlan).toBeDefined();
  });

  it('should create a valid plan for cli target', () => {
    const plan = buildPublicationPlan('Release v2', 'Nova versão do CLI', 'Conteúdo da release', 'cli');
    expect(plan.payload.title).toBe('Release v2');
    expect(plan.payload.summary).toBe('Nova versão do CLI');
    expect(plan.target.kind).toBe('cli');
    expect(plan.validated).toBe(false);
    expect(plan.payload.metadata.generatedAt).toBeDefined();
  });

  it('should create plan with file target', () => {
    const plan = buildPublicationPlan('Doc', 'Resumo', 'Conteúdo', 'file');
    expect(plan.target.kind).toBe('file');
  });
});
