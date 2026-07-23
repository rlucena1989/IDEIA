import { describe, it, expect } from '@jest/globals';
import { buildGenerationPrompt, buildConsistencyPrompt, buildHardeningPrompt, renderPrompt } from '../prompt-factory';
import { getMasterPrompt } from '../prompt-master';

describe('prompt-factory', () => {
  it('buildGenerationPrompt should be defined', () => {
    expect(buildGenerationPrompt).toBeDefined();
  });

  it('should include product name when provided', () => {
    const result = buildGenerationPrompt({ productName: 'test-cli' });
    expect(result).toContain('test-cli');
    expect(result).toContain('Gere os artefatos');
  });

  it('buildConsistencyPrompt should return prompt text', () => {
    const result = buildConsistencyPrompt();
    expect(result).toContain('Compare documentação');
    expect(result).toContain('gaps prioritários');
  });

  it('buildHardeningPrompt should return prompt text', () => {
    const result = buildHardeningPrompt();
    expect(result).toContain('Avalie contratos');
  });

  it('renderPrompt should be defined', () => {
    expect(renderPrompt).toBeDefined();
  });

  it('renderPrompt should render master prompt', () => {
    const master = getMasterPrompt();
    const rendered = renderPrompt(master);
    expect(rendered.id).toBe('ai-devkit-master');
    expect(rendered.content).toContain('planejador e materializador');
    expect(rendered.version).toBe('1.0.0');
  });

  it('renderPrompt should include gaps when provided', () => {
    const master = getMasterPrompt();
    const rendered = renderPrompt(master, { gaps: ['falta documentação', 'sem testes'] });
    expect(rendered.content).toContain('falta documentação');
    expect(rendered.content).toContain('sem testes');
  });
});
