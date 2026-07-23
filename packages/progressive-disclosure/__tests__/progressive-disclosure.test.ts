import { ProgressiveDisclosure } from '../src/progressive-disclosure';
import { FeatureDefinition } from '../src/types';

describe('ProgressiveDisclosure', () => {
  describe('beginner level', () => {
    it('can see beginner features', () => {
      const pd = new ProgressiveDisclosure();
      const profile = pd.getProfile();
      expect(profile.userLevel).toBe('beginner');
      const visible = pd.getVisibleFeatures();
      const visibleIds = visible.map(v => v.feature.id);
      expect(visibleIds).toContain('project-scaffold');
      expect(visibleIds).toContain('cli-help');
      expect(visibleIds).toContain('template-list');
      expect(visibleIds).toContain('basic-config');
    });

    it('intermediate features are locked for beginner', () => {
      const pd = new ProgressiveDisclosure();
      const locked = pd.getLockedFeatures();
      const lockedIds = locked.map(l => l.feature.id);
      expect(lockedIds).toContain('code-generation');
      expect(lockedIds).toContain('basic-monitoring');
    });
  });

  describe('registerFeature', () => {
    it('registers a new feature and makes it available', () => {
      const pd = new ProgressiveDisclosure();
      const custom: FeatureDefinition = {
        id: 'custom-feature',
        name: 'Custom Feature',
        description: 'A custom feature for testing',
        category: 'custom',
        visibility: 'available',
        minLevel: 'beginner',
        unlockConditions: [{ type: 'level', value: 'beginner' }],
        dependsOn: [],
        hints: ['Use this feature wisely'],
      };
      pd.registerFeature(custom);
      const state = pd.getFeatureState('custom-feature');
      expect(state.state).toBe('available');
      expect(state.feature.name).toBe('Custom Feature');
    });
  });

  describe('updateProgress', () => {
    it('updates progress and verifies feature unlocks', () => {
      const pd = new ProgressiveDisclosure({ level: 'beginner', usedFeatures: ['agent-chat'] });
      const state = pd.getFeatureState('agent-chat');
      expect(state.state).toBe('locked');

      pd.updateProgress({ level: 'intermediate', usedFeatures: ['agent-chat', 'project-scaffold'], runCommands: ['ideia init'] });
      const updatedState = pd.getFeatureState('agent-chat');
      expect(updatedState.state).not.toBe('locked');
    });
  });

  describe('getLockedFeatures', () => {
    it('returns locked features with reasons', () => {
      const pd = new ProgressiveDisclosure();
      const locked = pd.getLockedFeatures();
      expect(locked.length).toBeGreaterThan(0);
      for (const item of locked) {
        expect(item.reason).toBeTruthy();
        expect(item.state).toBe('locked');
      }
    });
  });

  describe('getDiscoverableFeatures', () => {
    it('returns discoverable features for beginner who has run ideia init', () => {
      const pd = new ProgressiveDisclosure({
        level: 'beginner',
        runCommands: ['ideia init'],
        usedFeatures: ['project-scaffold'],
      });
      const discoverable = pd.getDiscoverableFeatures();
      const discoverableIds = discoverable.map(d => d.feature.id);
      expect(discoverableIds).toContain('agent-chat');
    });
  });

  describe('getNextRecommendedFeature', () => {
    it('returns a recommended feature when there are close unlocks', () => {
      const pd = new ProgressiveDisclosure({
        level: 'intermediate',
        timeSpentMinutes: 25,
      });
      const recommended = pd.getNextRecommendedFeature();
      expect(recommended).not.toBeNull();
      expect(recommended!.unlockProgress).toBeGreaterThan(0);
    });

    it('returns null when all features are unlocked', () => {
      const pd = new ProgressiveDisclosure({
        level: 'expert',
        completedTutorials: ['advanced-agent-training'],
        usedFeatures: ['agent-chat', 'code-generation', 'multi-agent', 'basic-monitoring', 'performance-profiler', 'security-scan', 'git-integration', 'deployment-pipeline', 'canary-deploy', 'custom-agent'],
        runCommands: ['ideia init'],
        timeSpentMinutes: 9999,
        projectsCreated: 10,
        earnedBadges: ['security-master'],
      });
      pd.unlockFeature('agent-chat');
      pd.unlockFeature('git-integration');
      pd.unlockFeature('security-scan');
      pd.unlockFeature('auto-healing');
      pd.unlockFeature('custom-security-policy');
      pd.unlockFeature('canary-deploy');
      pd.unlockFeature('chaos-engineering');
      pd.unlockFeature('cross-project-learning');
      const recommended = pd.getNextRecommendedFeature();
      expect(recommended).toBeNull();
    });
  });

  describe('getOverallProgress', () => {
    it('returns a progress percentage', () => {
      const pd = new ProgressiveDisclosure();
      const progress = pd.getOverallProgress();
      expect(typeof progress).toBe('number');
      expect(progress).toBeGreaterThanOrEqual(0);
      expect(progress).toBeLessThanOrEqual(1);
    });

    it('progress increases when features are unlocked', () => {
      const pd = new ProgressiveDisclosure({ level: 'beginner' });
      const before = pd.getOverallProgress();
      pd.updateProgress({ level: 'intermediate', usedFeatures: ['project-scaffold', 'agent-chat'], runCommands: ['ideia init'], timeSpentMinutes: 60, projectsCreated: 2 });
      pd.unlockFeature('agent-chat');
      pd.unlockFeature('code-generation');
      pd.unlockFeature('basic-monitoring');
      pd.unlockFeature('git-integration');
      const after = pd.getOverallProgress();
      expect(after).toBeGreaterThan(before);
    });
  });

  describe('unlockFeature', () => {
    it('force unlocks a feature', () => {
      const pd = new ProgressiveDisclosure();
      const result = pd.unlockFeature('project-scaffold');
      expect(result).toBe(true);
      const state = pd.getFeatureState('project-scaffold');
      expect(state.state).toBe('highlighted');
    });

    it('returns false for unknown feature', () => {
      const pd = new ProgressiveDisclosure();
      const result = pd.unlockFeature('nonexistent');
      expect(result).toBe(false);
    });
  });

  describe('advanceLevel', () => {
    it('advances level when conditions are met', () => {
      const pd = new ProgressiveDisclosure({
        level: 'beginner',
        usedFeatures: ['agent-chat', 'code-generation', 'git-integration', 'basic-monitoring'],
        runCommands: ['ideia init'],
        timeSpentMinutes: 120,
        projectsCreated: 3,
      });
      pd.unlockFeature('agent-chat');
      pd.unlockFeature('code-generation');
      pd.unlockFeature('git-integration');
      pd.unlockFeature('basic-monitoring');

      const profile = pd.getProfile();
      expect(profile.overallProgress).toBeGreaterThanOrEqual(0.8);

      const next = pd.advanceLevel();
      expect(next).toBe('intermediate');
      expect(pd.getProfile().userLevel).toBe('intermediate');
    });

    it('returns null when at max level', () => {
      const pd = new ProgressiveDisclosure({ level: 'expert' });
      const next = pd.advanceLevel();
      expect(next).toBeNull();
    });

    it('returns null when progress is too low', () => {
      const pd = new ProgressiveDisclosure();
      const next = pd.advanceLevel();
      expect(next).toBeNull();
    });
  });

  describe('getLevelProgress', () => {
    it('returns level progress info', () => {
      const pd = new ProgressiveDisclosure();
      const info = pd.getLevelProgress('beginner');
      expect(info.current).toBe('beginner');
      expect(info.next).toBe('intermediate');
      expect(typeof info.progress).toBe('number');
      expect(Array.isArray(info.conditions)).toBe(true);
    });

    it('returns null next when at max level', () => {
      const pd = new ProgressiveDisclosure();
      const info = pd.getLevelProgress('expert');
      expect(info.next).toBeNull();
    });
  });

  describe('getFeaturesByGroup', () => {
    it('returns features filtered by group', () => {
      const pd = new ProgressiveDisclosure();
      const gettingStarted = pd.getFeaturesByGroup('getting-started');
      expect(gettingStarted.length).toBeGreaterThan(0);
      for (const item of gettingStarted) {
        expect(item.feature.group).toBe('getting-started');
      }
    });

    it('returns empty array for non-existent group', () => {
      const pd = new ProgressiveDisclosure();
      const result = pd.getFeaturesByGroup('nonexistent-group');
      expect(result).toEqual([]);
    });
  });

  describe('edge cases', () => {
    it('unknown feature id returns hidden', () => {
      const pd = new ProgressiveDisclosure();
      const state = pd.getFeatureState('unknown-feature');
      expect(state.state).toBe('hidden');
      expect(state.reason).toBe('Unknown feature');
    });

    it('feature with unmet dependencies stays locked', () => {
      const pd = new ProgressiveDisclosure({ level: 'intermediate', usedFeatures: ['agent-chat'] });
      const state = pd.getFeatureState('code-generation');
      expect(state.state).toBe('locked');
    });
  });

  describe('resetProgress', () => {
    it('resets progress to default', () => {
      const pd = new ProgressiveDisclosure({
        level: 'advanced',
        usedFeatures: ['agent-chat', 'code-generation'],
        timeSpentMinutes: 500,
        projectsCreated: 10,
      });
      pd.resetProgress();
      const profile = pd.getProfile();
      expect(profile.userLevel).toBe('beginner');
      expect(profile.overallProgress).toBeLessThan(1);
    });
  });
});
