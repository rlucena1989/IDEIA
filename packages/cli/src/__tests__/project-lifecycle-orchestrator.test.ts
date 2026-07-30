import { describe, it, expect, beforeEach } from '@jest/globals';

describe('lifecycle - project-lifecycle-orchestrator', () => {
  let ProjectLifecycleOrchestrator: typeof import('../lifecycle/project-lifecycle-orchestrator').ProjectLifecycleOrchestrator;
  let orchestrator: import('../lifecycle/project-lifecycle-orchestrator').ProjectLifecycleOrchestrator;

  beforeEach(() => {
    jest.resetModules();
    ProjectLifecycleOrchestrator = require('../lifecycle/project-lifecycle-orchestrator').ProjectLifecycleOrchestrator;
    orchestrator = new ProjectLifecycleOrchestrator('test-project');
  });

  it('inicializa com fase idea em progresso', () => {
    const current = orchestrator.getCurrentPhase();
    expect(current).toBeDefined();
    expect(current!.phase).toBe('idea');
    expect(current!.status).toBe('in_progress');
  });

  it('getPhaseDefinitions retorna 7 definicoes', () => {
    const defs = orchestrator.getPhaseDefinitions();
    expect(defs).toHaveLength(7);
    expect(defs[0].phase).toBe('idea');
    expect(defs[6].phase).toBe('monitoring');
  });

  it('getPhaseState retorna estado de fase especifica', () => {
    const idea = orchestrator.getPhaseState('idea');
    expect(idea).toBeDefined();
    expect(idea!.phase).toBe('idea');
  });

  it('getPhaseState retorna undefined para fase inexistente', () => {
    expect(orchestrator.getPhaseState('invalid' as never)).toBeUndefined();
  });

  it('advance avanca para proxima fase', () => {
    const result = orchestrator.advance('idea');
    expect(result).toBe(true);

    const current = orchestrator.getCurrentPhase();
    expect(current!.phase).toBe('analysis');
    expect(current!.status).toBe('in_progress');
  });

  it('advance adiciona artefatos', () => {
    orchestrator.advance('idea', ['docs/idea.md']);
    const ideaState = orchestrator.getPhaseState('idea');
    expect(ideaState!.artifacts).toContain('docs/idea.md');
  });

  it('advance retorna false se fase nao esta in_progress', () => {
    const result = orchestrator.advance('analysis');
    expect(result).toBe(false);
  });

  it('advance retorna false se fase nao encontrada', () => {
    const result = orchestrator.advance('invalid' as never);
    expect(result).toBe(false);
  });

  it('fail marca fase como failed e faz rollback', () => {
    orchestrator.advance('idea');
    const result = orchestrator.fail('analysis', 'Erro critico');
    expect(result).toBe(true);

    const report = orchestrator.getReport();
    expect(report.status).toBe('active');
  });

  it('fail retorna false para fase inexistente', () => {
    const result = orchestrator.fail('invalid' as never, 'error');
    expect(result).toBe(false);
  });

  it('rollbackTo volta para fase especifica', () => {
    orchestrator.advance('idea');
    orchestrator.advance('analysis');

    orchestrator.rollbackTo('idea');
    const ideaState = orchestrator.getPhaseState('idea');
    expect(ideaState!.status).toBe('in_progress');

    const analysisState = orchestrator.getPhaseState('analysis');
    expect(analysisState!.status).toBe('pending');
  });

  it('addCheckpoint adiciona checkpoint a fase', () => {
    orchestrator.addCheckpoint('idea', 'Validar escopo', true);
    const ideaState = orchestrator.getPhaseState('idea');
    expect(ideaState!.checkpoints).toHaveLength(1);
    expect(ideaState!.checkpoints[0].description).toBe('Validar escopo');
    expect(ideaState!.checkpoints[0].passed).toBe(true);
  });

  it('validateCheckpoints retorna true quando sem checkpoints', () => {
    expect(orchestrator.validateCheckpoints('idea')).toBe(true);
  });

  it('validateCheckpoints retorna true quando todos passam', () => {
    orchestrator.addCheckpoint('idea', 'CP1', true);
    orchestrator.addCheckpoint('idea', 'CP2', true);
    expect(orchestrator.validateCheckpoints('idea')).toBe(true);
  });

  it('validateCheckpoints retorna false quando algum falha', () => {
    orchestrator.addCheckpoint('idea', 'CP1', true);
    orchestrator.addCheckpoint('idea', 'CP2', false);
    expect(orchestrator.validateCheckpoints('idea')).toBe(false);
  });

  it('addArtifact adiciona artefato a fase', () => {
    orchestrator.addArtifact('idea', 'docs/idea.md');
    const ideaState = orchestrator.getPhaseState('idea');
    expect(ideaState!.artifacts).toContain('docs/idea.md');
  });

  it('getReport retorna relatorio completo', () => {
    const report = orchestrator.getReport();
    expect(report.projectName).toBe('test-project');
    expect(report.currentPhase).toBe('idea');
    expect(report.overallProgress).toBe(0);
    expect(report.status).toBe('active');
    expect(report.phases).toHaveLength(7);
    expect(report.startedAt).toBeTruthy();
    expect(report.elapsedMinutes).toBeGreaterThanOrEqual(0);
  });

  it('getReport mostra progresso apos avancar fases', () => {
    orchestrator.advance('idea');
    const report = orchestrator.getReport();
    expect(report.overallProgress).toBeGreaterThan(0);
  });

  it('getEstimatedTimeRemaining retorna tempo total no inicio', () => {
    const remaining = orchestrator.getEstimatedTimeRemaining();
    expect(remaining).toBeGreaterThan(0);
  });

  it('getEstimatedTimeRemaining diminui apos avancar', () => {
    const before = orchestrator.getEstimatedTimeRemaining();
    orchestrator.advance('idea');
    orchestrator.advance('analysis');
    const after = orchestrator.getEstimatedTimeRemaining();
    expect(after).toBeLessThan(before);
  });

  it('formatReport text retorna string formatada', () => {
    const text = orchestrator.formatReport('text');
    expect(typeof text).toBe('string');
    expect(text).toContain('test-project');
    expect(text).toContain('Idea');
  });

  it('formatReport json retorna JSON valido', () => {
    const json = orchestrator.formatReport('json');
    const parsed = JSON.parse(json);
    expect(parsed.projectName).toBe('test-project');
  });

  it('completa todas as fases ate o final', () => {
    const phases = ['idea', 'analysis', 'architecture', 'implementation', 'testing', 'deployment', 'monitoring'] as const;
    for (const phase of phases) {
      const result = orchestrator.advance(phase);
      expect(result).toBe(true);
    }

    const report = orchestrator.getReport();
    expect(report.status).toBe('completed');
    expect(report.overallProgress).toBe(100);
  });

  it('nao avanca se checkpoints falham', () => {
    orchestrator.addCheckpoint('idea', 'Must pass', false);
    const result = orchestrator.advance('idea');
    expect(result).toBe(false);

    const ideaState = orchestrator.getPhaseState('idea');
    expect(ideaState!.status).toBe('failed');
  });
});
