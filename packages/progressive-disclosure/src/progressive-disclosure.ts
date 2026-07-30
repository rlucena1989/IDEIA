import { createLogger } from '@ideia/logger';
import { UserLevel, FeatureId, FeatureDefinition, UserProgress, FeatureState, ProgressiveDisclosureProfile } from './types';
import { levelIndex, getLevelAbove, evaluateCondition, conditionProgress, defaultProgress } from './disclosure-helpers';
import { builtInFeatures } from './builtin-features';

const logger = createLogger('progressive-disclosure');

export class ProgressiveDisclosure {
  private features: Map<FeatureId, FeatureDefinition>;
  private userProgress: UserProgress;

  constructor(initialProgress?: Partial<UserProgress>) {
    this.features = new Map();
    for (const f of builtInFeatures()) this.features.set(f.id, f);
    this.userProgress = { ...defaultProgress(), ...initialProgress };
  }

  registerFeature(feature: FeatureDefinition): void {
    this.features.set(feature.id, feature);
  }

  updateProgress(update: Partial<UserProgress>): void {
    this.userProgress = { ...this.userProgress, ...update,
      completedTutorials: update.completedTutorials ?? this.userProgress.completedTutorials,
      usedFeatures: update.usedFeatures ?? this.userProgress.usedFeatures,
      runCommands: update.runCommands ?? this.userProgress.runCommands,
      earnedBadges: update.earnedBadges ?? this.userProgress.earnedBadges,
      discoveredFeatures: update.discoveredFeatures ?? this.userProgress.discoveredFeatures,
    };
  }

  getFeatureState(id: FeatureId): FeatureState {
    const feature = this.features.get(id);
    if (!feature) return { feature: { id, name: id, description: '', category: '', visibility: 'hidden', minLevel: 'beginner', unlockConditions: [], dependsOn: [], hints: [] }, state: 'hidden', reason: 'Unknown feature', unlockProgress: 0 };

    const isDiscovered = this.userProgress.discoveredFeatures.includes(feature.id);
    if (isDiscovered) return { feature, state: 'highlighted', reason: 'Feature unlocked by discovery', unlockProgress: 1, nextHint: feature.hints[0] };

    const allConditions = [...feature.unlockConditions];
    const depReasons: string[] = [];
    for (const depId of feature.dependsOn) {
      const depState = this.getFeatureState(depId);
      if (depState.state !== 'available' && depState.state !== 'discoverable' && depState.state !== 'highlighted') depReasons.push(`Requires: ${depState.feature.name} (${depState.state})`);
    }

    const conditionsMet = allConditions.every(c => evaluateCondition(c, this.userProgress));
    const levelCondition = allConditions.find(c => c.type === 'level');
    const levelMet = levelCondition ? evaluateCondition(levelCondition, this.userProgress) : true;

    if (!levelMet && depReasons.length > 0) {
      const allLocksMet = allConditions.every(c => c.type === 'level' || evaluateCondition(c, this.userProgress));
      const depLocksMet = feature.dependsOn.every(depId => { const s = this.getFeatureState(depId); return s.state === 'available' || s.state === 'discoverable' || s.state === 'highlighted'; });
      if (!allLocksMet && !depLocksMet) return { feature, state: 'locked', reason: `Level ${feature.minLevel} required. ${depReasons.join('; ')}`, unlockProgress: Math.min(...allConditions.map(c => conditionProgress(c, this.userProgress)), ...(feature.dependsOn.length > 0 ? [0] : [1])), nextHint: feature.hints[0] };
    }

    if (!levelMet) return { feature, state: 'locked', reason: `Level ${feature.minLevel} required. Current: ${this.userProgress.level}`, unlockProgress: Math.min(...allConditions.map(c => conditionProgress(c, this.userProgress))), nextHint: feature.hints[0] };

    if (!conditionsMet) {
      const unmet = allConditions.find(c => !evaluateCondition(c, this.userProgress));
      return { feature, state: 'locked', reason: unmet ? `Condition not met: ${unmet.type} = ${unmet.value}${unmet.description ? ` (${unmet.description})` : ''}` : 'Some conditions not met', unlockProgress: Math.min(...allConditions.map(c => conditionProgress(c, this.userProgress))), nextHint: feature.hints[0] };
    }

    if (depReasons.length > 0) return { feature, state: 'locked', reason: depReasons.join('; '), unlockProgress: Math.min(...allConditions.map(c => conditionProgress(c, this.userProgress))), nextHint: feature.hints[0] };

    if (feature.visibility === 'hidden') return { feature, state: 'hidden', reason: 'Feature is not yet discoverable at your level', unlockProgress: 1 };
    if (feature.visibility === 'highlighted') return { feature, state: 'highlighted', reason: 'Recommended feature for your level', unlockProgress: 1, nextHint: feature.hints[0] };
    if (feature.visibility === 'discoverable') return { feature, state: 'discoverable', reason: 'New feature available for exploration', unlockProgress: 1, nextHint: feature.hints[0] };

    return { feature, state: 'available', reason: 'Feature is available', unlockProgress: 1, nextHint: feature.hints[0] };
  }

  getProfile(): ProgressiveDisclosureProfile {
    const allFeatures = Array.from(this.features.values());
    const allStates = allFeatures.map(f => this.getFeatureState(f.id));
    return { userLevel: this.userProgress.level, visibleFeatures: allStates.filter(s => s.state === 'available' || s.state === 'highlighted'), lockedFeatures: allStates.filter(s => s.state === 'locked'), discoveredFeatures: allStates.filter(s => s.state === 'discoverable'), nextRecommendedFeature: this.getNextRecommendedFeature() ?? undefined, overallProgress: this.getOverallProgress() };
  }

  getVisibleFeatures(): FeatureState[] {
    return Array.from(this.features.values()).map(f => this.getFeatureState(f.id)).filter(s => s.state === 'available' || s.state === 'discoverable' || s.state === 'highlighted');
  }

  getLockedFeatures(): FeatureState[] {
    return Array.from(this.features.values()).map(f => this.getFeatureState(f.id)).filter(s => s.state === 'locked');
  }

  getDiscoverableFeatures(): FeatureState[] {
    return Array.from(this.features.values()).map(f => this.getFeatureState(f.id)).filter(s => s.state === 'discoverable');
  }

  getNextRecommendedFeature(): FeatureState | null {
    const locked = this.getLockedFeatures().sort((a, b) => b.unlockProgress - a.unlockProgress);
    if (locked.length > 0 && locked[0].unlockProgress > 0) return locked[0];
    const discoverable = this.getDiscoverableFeatures();
    return discoverable.length > 0 ? discoverable[0] : null;
  }

  unlockFeature(id: FeatureId): boolean {
    const feature = this.features.get(id);
    if (!feature) return false;
    if (!this.userProgress.discoveredFeatures.includes(id)) this.userProgress.discoveredFeatures.push(id);
    if (!this.userProgress.usedFeatures.includes(id)) this.userProgress.usedFeatures.push(id);
    return true;
  }

  getOverallProgress(): number {
    const featuresForLevel = Array.from(this.features.values()).filter(f => {
      const levelCond = f.unlockConditions.find(c => c.type === 'level');
      return !levelCond || levelIndex(levelCond.value as UserLevel) <= levelIndex(this.userProgress.level);
    });
    if (featuresForLevel.length === 0) return 1;
    const totalProgress = featuresForLevel.reduce((sum, f) => {
      const state = this.getFeatureState(f.id);
      return sum + (state.state === 'available' || state.state === 'highlighted' || state.state === 'discoverable' ? 1 : state.unlockProgress);
    }, 0);
    return totalProgress / featuresForLevel.length;
  }

  advanceLevel(): UserLevel | null {
    const next = getLevelAbove(this.userProgress.level);
    if (!next) return null;
    const featuresForNext = Array.from(this.features.values()).filter(f => {
      const levelCond = f.unlockConditions.find(c => c.type === 'level');
      return levelCond && (levelCond.value as UserLevel) === next;
    });
    for (const feature of featuresForNext) { if (this.getFeatureState(feature.id).state === 'locked') return null; }
    if (this.getOverallProgress() < 0.8) return null;
    this.userProgress.level = next;
    return next;
  }

  getLevelProgress(current: UserLevel): { current: UserLevel; next: UserLevel | null; progress: number; conditions: string[] } {
    const next = getLevelAbove(current);
    const featuresForNext = Array.from(this.features.values()).filter(f => {
      const levelCond = f.unlockConditions.find(c => c.type === 'level');
      return levelCond && (levelCond.value as UserLevel) === next;
    });
    return { current, next, progress: this.getOverallProgress(), conditions: featuresForNext.map(f => this.getFeatureState(f.id)).filter(s => s.state === 'locked').map(s => s.reason) };
  }

  getFeaturesByGroup(group: string): FeatureState[] {
    return Array.from(this.features.values()).filter(f => f.group === group).map(f => this.getFeatureState(f.id));
  }

  resetProgress(): void { this.userProgress = defaultProgress(); }
}
