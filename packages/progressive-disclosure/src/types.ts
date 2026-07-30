export type UserLevel = 'beginner' | 'intermediate' | 'advanced' | 'expert';

export type FeatureId = string;

export type FeatureVisibility = 'hidden' | 'locked' | 'available' | 'discoverable' | 'highlighted' | 'default';

export interface UnlockCondition {
  type: 'level' | 'tutorial_completed' | 'feature_used' | 'command_run' | 'time_spent_minutes' | 'projects_created' | 'badge_earned';
  value: string | number;
  description?: string;
}

export interface FeatureDefinition {
  id: FeatureId;
  name: string;
  description: string;
  category: string;
  visibility: FeatureVisibility;
  minLevel: UserLevel;
  unlockConditions: UnlockCondition[];
  dependsOn: FeatureId[];
  hints: string[];
  commandHint?: string;
  group?: string;
}

export interface UserProgress {
  level: UserLevel;
  completedTutorials: string[];
  usedFeatures: string[];
  runCommands: string[];
  timeSpentMinutes: number;
  projectsCreated: number;
  earnedBadges: string[];
  discoveredFeatures: FeatureId[];
}

export interface FeatureState {
  feature: FeatureDefinition;
  state: FeatureVisibility;
  reason: string;
  unlockProgress: number;
  nextHint?: string;
}

export interface ProgressiveDisclosureProfile {
  userLevel: UserLevel;
  visibleFeatures: FeatureState[];
  lockedFeatures: FeatureState[];
  discoveredFeatures: FeatureState[];
  nextRecommendedFeature?: FeatureState;
  overallProgress: number;
}
