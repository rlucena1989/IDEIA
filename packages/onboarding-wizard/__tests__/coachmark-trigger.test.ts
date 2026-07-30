import { CoachmarkManager, MemoryCoachmarkStorage } from '../src/coachmark-manager';
import { CoachmarkTrigger } from '../src/coachmark-trigger';

describe('CoachmarkTrigger', () => {
  let manager: CoachmarkManager;
  let trigger: CoachmarkTrigger;

  beforeEach(() => {
    manager = new CoachmarkManager(new MemoryCoachmarkStorage());
    trigger = new CoachmarkTrigger(manager);
  });

  describe('onFirstCommand', () => {
    it('shows coachmark on first command usage', () => {
      trigger.onFirstCommand('init');
      const pending = manager.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('command:init');
    });

    it('does not show coachmark on repeated command usage', () => {
      trigger.onFirstCommand('init');
      trigger.onFirstCommand('init');
      expect(manager.getAll()).toHaveLength(1);
    });

    it('does not show if coachmark was already completed', () => {
      trigger.onFirstCommand('init');
      manager.dismiss('command:init');
      trigger.onFirstCommand('init');
      expect(manager.getPending()).toHaveLength(0);
    });
  });

  describe('onFirstDashboard', () => {
    it('shows coachmark on first dashboard visit', () => {
      trigger.onFirstDashboard();
      const pending = manager.getPending();
      expect(pending).toHaveLength(1);
      expect(pending[0].id).toBe('feature:dashboard');
    });

    it('shows only once', () => {
      trigger.onFirstDashboard();
      trigger.onFirstDashboard();
      expect(manager.getAll()).toHaveLength(1);
    });
  });

  describe('onFirstConfig', () => {
    it('shows coachmark on first config access', () => {
      trigger.onFirstConfig();
      const coachmark = manager.getById('feature:config');
      expect(coachmark).toBeDefined();
      expect(coachmark!.feature).toBe('config');
    });
  });

  describe('onFirstChat', () => {
    it('shows coachmark on first chat usage', () => {
      trigger.onFirstChat();
      const coachmark = manager.getById('feature:chat');
      expect(coachmark).toBeDefined();
      expect(coachmark!.target).toBe('#ideia-chat');
    });
  });

  describe('reset', () => {
    it('clears triggered set', () => {
      trigger.onFirstCommand('init');
      trigger.reset();
      trigger.onFirstCommand('init');
      expect(manager.getAll()).toHaveLength(1);
    });
  });

  it('can trigger all features independently', () => {
    trigger.onFirstCommand('build');
    trigger.onFirstDashboard();
    trigger.onFirstConfig();
    trigger.onFirstChat();
    expect(manager.getPending()).toHaveLength(4);
  });
});
