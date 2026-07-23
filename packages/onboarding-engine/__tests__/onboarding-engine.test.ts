import { OnboardingEngine } from '../src/onboarding-engine';
describe('OnboardingEngine', () => {
  it('should start onboarding', () => {
    const oe = new OnboardingEngine(); const s = oe.start();
    expect(s.completed).toBe(false); expect(s.currentStep).toBe(1);
  });
  it('should complete steps', () => {
    const oe = new OnboardingEngine(); oe.start();
    oe.completeStep(1); expect(oe.getStatus().currentStep).toBe(2);
  });
  it('should mark complete', () => {
    const oe = new OnboardingEngine(); oe.start(); oe.complete();
    expect(oe.isComplete()).toBe(true);
  });
  it('should restart', () => {
    const oe = new OnboardingEngine(); oe.start(); oe.complete(); oe.restart();
    expect(oe.isComplete()).toBe(false);
  });
  it('should track tutorial progress', () => {
    const oe = new OnboardingEngine(); oe.start();
    oe.updateTutorialProgress(50); expect(oe.getStatus().tutorialProgress).toBe(50);
  });
});
