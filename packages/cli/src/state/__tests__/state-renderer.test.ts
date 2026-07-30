import { describe, it, expect } from '@jest/globals';
import { renderStateMarkdown, renderStateJSON } from '../state-renderer';
import type { DevkitState } from '../state-types';

const sampleState: DevkitState = {
  version: '1.0.0',
  lastUpdated: '2026-07-26T00:00:00.000Z',
  summary: 'Test summary',
  blocks: [
    {
      id: 'b1',
      title: 'Block 1',
      status: 'done',
      summary: 'Completed block',
      evidence: ['file1.ts', 'file2.ts'],
      risks: ['risk1'],
    },
    {
      id: 'b2',
      title: 'Block 2',
      status: 'partial',
      summary: 'Partial block',
      evidence: ['file3.ts'],
    },
  ],
  metrics: [
    { name: 'tests', value: 42, unit: 'passing', description: 'Test count' },
    { name: 'ready', value: true, description: 'Is ready' },
  ],
  artifacts: [
    { path: 'docs/', purpose: 'Documentation', status: 'present' },
  ],
  commands: [
    { command: 'build', purpose: 'Build project', status: 'active' },
  ],
  blockers: ['Missing config'],
  nextSteps: ['Add tests'],
};

describe('renderStateMarkdown', () => {
  it('should render a markdown string', () => {
    const md = renderStateMarkdown(sampleState);
    expect(typeof md).toBe('string');
    expect(md).toContain('# Estado consolidado do ai-devkit');
  });

  it('should include blocks section', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('## Blocos');
    expect(md).toContain('Block 1');
    expect(md).toContain('Block 2');
  });

  it('should include metrics section', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('## Métricas');
    expect(md).toContain('tests');
  });

  it('should include artifacts section', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('## Artefatos');
    expect(md).toContain('docs/');
  });

  it('should include commands section', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('## Comandos');
    expect(md).toContain('build');
  });

  it('should include blockers section', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('## Bloqueadores');
    expect(md).toContain('Missing config');
  });

  it('should include next steps section', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('## Próximos passos');
    expect(md).toContain('Add tests');
  });

  it('should include risks when present', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('Riscos');
    expect(md).toContain('risk1');
  });

  it('should not include risks when absent', () => {
    const noRisks: DevkitState = {
      ...sampleState,
      blocks: [{
        id: 'b1', title: 'No Risk', status: 'done' as const,
        summary: 'OK', evidence: [],
      }],
    };
    const md = renderStateMarkdown(noRisks);
    expect(md).not.toContain('Riscos');
  });

  it('should show last updated timestamp', () => {
    const md = renderStateMarkdown(sampleState);
    expect(md).toContain('## Atualizado em');
    expect(md).toContain('2026-07-26');
  });
});

describe('renderStateJSON', () => {
  it('should render prettified JSON', () => {
    const json = renderStateJSON(sampleState);
    const parsed = JSON.parse(json);
    expect(parsed.version).toBe('1.0.0');
    expect(parsed.summary).toBe('Test summary');
  });

  it('should include all blocks', () => {
    const json = renderStateJSON(sampleState);
    const parsed = JSON.parse(json);
    expect(parsed.blocks).toHaveLength(2);
  });

  it('should include all metrics', () => {
    const json = renderStateJSON(sampleState);
    const parsed = JSON.parse(json);
    expect(parsed.metrics).toHaveLength(2);
  });

  it('should be valid JSON', () => {
    const json = renderStateJSON(sampleState);
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should format with indentation', () => {
    const json = renderStateJSON(sampleState);
    expect(json).toContain('\n  ');
  });
});
