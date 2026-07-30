import { AdaptiveOnboardingWizard } from '../src/adaptive-wizard';
import { WizardIntegration } from '../src/wizard-integration';
import { OnboardingWizard } from '../src/onboarding-wizard';

describe('AdaptiveOnboardingWizard', () => {
  it('extends OnboardingWizard', () => {
    const w = new AdaptiveOnboardingWizard();
    expect(w).toBeInstanceOf(OnboardingWizard);
  });

  it('getAdaptationPhase returns observation for 0', () => {
    const w = new AdaptiveOnboardingWizard();
    expect(w.getAdaptationPhase(0)).toBe('observation');
  });

  it('getAdaptationPhase returns suggestion for 100', () => {
    const w = new AdaptiveOnboardingWizard();
    expect(w.getAdaptationPhase(100)).toBe('suggestion');
  });

  it('getAdaptationPhase returns auto for 250', () => {
    const w = new AdaptiveOnboardingWizard();
    expect(w.getAdaptationPhase(250)).toBe('auto');
  });

  it('complete seeds profile.applied interaction', async () => {
    const w = new AdaptiveOnboardingWizard();
    const tracker = { record: jest.fn(), getCount: jest.fn().mockReturnValue(0), getState: jest.fn() };
    w.setInteractionTracker(tracker as unknown);
    await w.complete();
    expect(tracker.record).toHaveBeenCalledWith('profile.applied', 'onboarding-wizard', expect.any(Object));
  });

  it('injectSuggestions stores suggestions', () => {
    const w = new AdaptiveOnboardingWizard();
    const suggestions = [{ id: 's1', title: 'Test' }];
    w.injectSuggestions(suggestions as unknown);
    expect(w.getAdaptiveContext()).toBeDefined();
  });
});

describe('WizardIntegration', () => {
  it('can be constructed', () => {
    const wi = new WizardIntegration();
    expect(wi).toBeDefined();
  });

  it('runFullWizard returns forecast with observation phase at 0', async () => {
    const wi = new WizardIntegration();
    const result = await wi.runFullWizard('quick');
    expect(result).toBeDefined();
    expect(result.adaptationForecast.currentPhase).toBe('observation');
  });

  it('runFullWizard works in expert mode', async () => {
    const wi = new WizardIntegration();
    const result = await wi.runFullWizard('expert');
    expect(result.wizard.mode).toBe('expert');
  });
});
