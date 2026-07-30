import { describe, it, expect, jest, beforeEach } from '@jest/globals';

describe('commands - wizard', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('wizardCommand retorna Command com nome wizard', () => {
    const { wizardCommand } = require('../commands/wizard');
    const cmd = wizardCommand();
    expect(cmd.name()).toBe('wizard');
  });

  it('GOALS contem 5 objetivos', () => {
    const { GOALS } = require('../commands/wizard');
    expect(GOALS).toHaveLength(5);
    expect(GOALS.map((g: { id: string }) => g.id)).toEqual([
      'new-project', 'generate-api', 'add-tests', 'add-module', 'config-governance',
    ]);
  });

  it('FEATURE_TEMPLATES tem chaves para generate-api, add-tests, add-module', () => {
    const { FEATURE_TEMPLATES } = require('../commands/wizard');
    expect(FEATURE_TEMPLATES['generate-api']).toBeDefined();
    expect(FEATURE_TEMPLATES['add-tests']).toBeDefined();
    expect(FEATURE_TEMPLATES['add-module']).toBeDefined();
    expect(FEATURE_TEMPLATES['generate-api'].length).toBeGreaterThan(0);
  });

  it('printGoalSummary nao lanca para new-project', () => {
    const { printGoalSummary } = require('../commands/wizard');
    expect(() => printGoalSummary({ goal: 'new-project', name: 'test', language: 'ts', framework: 'nestjs', features: '', packageManager: 'npm' })).not.toThrow();
  });

  it('printGoalSummary nao lanca para generate-api', () => {
    const { printGoalSummary } = require('../commands/wizard');
    expect(() => printGoalSummary({ goal: 'generate-api', resource: 'users', template: 'REST endpoint with CRUD', fields: 'name:string', auth: 'yes' })).not.toThrow();
  });

  it('printGoalSummary nao lanca para add-tests', () => {
    const { printGoalSummary } = require('../commands/wizard');
    expect(() => printGoalSummary({ goal: 'add-tests', target: 'src/', type: 'Unit tests (jest)', framework: 'jest', coverage: '80' })).not.toThrow();
  });

  it('printGoalSummary nao lanca para add-module', () => {
    const { printGoalSummary } = require('../commands/wizard');
    expect(() => printGoalSummary({ goal: 'add-module', moduleName: 'auth', type: 'Clean Architecture module', withTests: 'yes', withDocs: 'yes' })).not.toThrow();
  });

  it('printGoalSummary nao lanca para config-governance', () => {
    const { printGoalSummary } = require('../commands/wizard');
    expect(() => printGoalSummary({ goal: 'config-governance', mode: 'Padrão (recomendado)', withCI: 'yes', withAdr: 'yes' })).not.toThrow();
  });
});
