import { describe, it, expect } from '@jest/globals';
import { LLMContextBuilder } from '../llm-context-builder';

describe('llm-context-builder', () => {
  const builder = new LLMContextBuilder();

  it('should build context for a task', () => {
    const context = builder.buildContext({
      category: 'feature',
      scope: 'module',
      urgency: 'high',
      keywords: ['deploy', 'pipeline', 'api'],
    });
    expect(context.systemOverview).toContain('IDEIA');
    expect(context.tokenEstimate).toBeGreaterThan(0);
    expect(context.priority).toBeGreaterThan(0.5);
  });

  it('should find relevant capabilities', () => {
    const context = builder.buildContext({
      category: 'bugfix',
      scope: 'project',
      urgency: 'critical',
      keywords: ['security', 'audit', 'policy'],
    });
    expect(context.relevantCapabilities.length).toBeGreaterThan(0);
  });

  it('should suggest workflows for devops tasks', () => {
    const context = builder.buildContext({
      category: 'devops',
      scope: 'project',
      urgency: 'medium',
      keywords: ['deploy'],
    });
    expect(context.suggestedWorkflows.length).toBeGreaterThan(0);
    const hasDeploy = context.suggestedWorkflows.some(w => w.toLowerCase().includes('deploy'));
    expect(hasDeploy).toBe(true);
  });

  it('should find relevant services', () => {
    const context = builder.buildContext({
      category: 'feature',
      scope: 'module',
      urgency: 'medium',
      keywords: ['agent', 'orchestration'],
    });
    expect(context.relevantServices.length).toBeGreaterThan(0);
  });

  it('should compress context to fit token limit', () => {
    const context = builder.buildContext({
      category: 'question',
      scope: 'single_file',
      urgency: 'low',
      keywords: ['help'],
    });
    const compressed = builder.compressContext(context, 500);
    expect(compressed.length).toBeLessThan(2000);
    expect(compressed).toContain('IDEIA');
  });

  it('should build system overview', () => {
    const overview = builder.buildSystemOverview();
    expect(overview).toContain('IDEIA');
    expect(overview).toContain('packages');
    expect(overview).toContain('capabilities');
  });

  it('should build capability report', () => {
    const report = builder.buildCapabilityReport();
    expect(report).toContain('Available Capabilities');
    expect(report).toContain('orchestration');
    expect(report).toContain('security');
  });
});
