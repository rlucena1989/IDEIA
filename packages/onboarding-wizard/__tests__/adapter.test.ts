import { describe, it, expect } from '@jest/globals';
import { OnboardingWizard, ConfigGenerator } from '../src/index';

describe('ConfigGenerator', () => {
  it('generates YAML config from wizard answers', () => {
    const generator = new ConfigGenerator();
    const answers = new Map<string, Record<string, string | number | boolean | string[]>>();
    answers.set('welcome', { profile: 'solo-dev' });
    answers.set('autonomy', { level: 'N2' });
    answers.set('scanner', { scanDepth: 'normal', watchMode: true });

    const result = generator.generate(answers, 'solo-dev');

    expect(result).toContain('profile: solo-dev');
    expect(result).toContain('autonomy:');
    expect(result).toContain('level: N2');
    expect(result).toContain('scanDepth: normal');
    expect(result).toContain('watchMode: true');
    expect(result).toContain('features:');
    expect(result).toContain('security:');
  });

  it('returns correct preset for enterprise profile', () => {
    const generator = new ConfigGenerator();
    const preset = generator.getPreset('enterprise');

    expect(preset.autonomyLevel).toBe('N1');
    expect(preset.features.ssoEnabled).toBe(true);
    expect(preset.features.complianceMode).toBe(true);
    expect(preset.security.level).toBe('high');
    expect(preset.security.encryptionAtRest).toBe(true);
    expect(preset.security.auditRetentionDays).toBe(365);
  });
});

describe('OnboardingWizard adapter', () => {
  it('accepts renderMode parameter in CLI flow', () => {
    const wizard = new OnboardingWizard();
    const step = wizard.start('quick', 'cli');

    expect(step).toBeDefined();
    expect(step.id).toBe('welcome');

    wizard.submitStep({ stepId: 'welcome', answers: { profile: 'solo-dev' } });
    wizard.submitStep({ stepId: 'autonomy', answers: { level: 'N2' } });

    const summary = wizard.complete();
    expect(summary.renderMode).toBe('cli');
  });

  it('generates config matching profile preset values', () => {
    const generator = new ConfigGenerator();
    const answers = new Map<string, Record<string, string | number | boolean | string[]>>();
    answers.set('welcome', { profile: 'enterprise' });
    answers.set('autonomy', { level: 'N1' });
    answers.set('scanner', { scanDepth: 'deep', watchMode: true });

    const configYaml = generator.generate(answers, 'enterprise');

    expect(configYaml).toContain('profile: enterprise');
    expect(configYaml).toContain('level: N1');
    expect(configYaml).toContain('complianceMode: true');
    expect(configYaml).toContain('ssoEnabled: true');
    expect(configYaml).toContain('auditRetentionDays: 365');
  });
});
