import { describe, it, expect } from '@jest/globals';
import { OnboardingWizard, WIZARD_STEPS, PROFILES, AUTONOMY_OPTIONS } from '../src/index';

describe('onboarding-wizard', () => {
  it('OnboardingWizard can be constructed with no deps', () => {
    const wizard = new OnboardingWizard();
    expect(wizard).toBeDefined();
  });

  it('start returns first step', () => {
    const wizard = new OnboardingWizard();
    const step = wizard.start('quick');
    expect(step).toBeDefined();
    expect(step.id).toBe('welcome');
  });

  it('WIZARD_STEPS is defined', () => {
    expect(Array.isArray(WIZARD_STEPS)).toBe(true);
    expect(WIZARD_STEPS.length).toBeGreaterThan(0);
  });

  it('PROFILES and AUTONOMY_OPTIONS are defined', () => {
    expect(Array.isArray(PROFILES)).toBe(true);
    expect(Array.isArray(AUTONOMY_OPTIONS)).toBe(true);
  });
});
