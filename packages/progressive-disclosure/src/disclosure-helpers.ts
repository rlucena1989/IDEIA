import { UserLevel, UnlockCondition, UserProgress } from './types';

const USER_LEVEL_ORDER: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

export function levelIndex(level: UserLevel): number {
  return USER_LEVEL_ORDER.indexOf(level);
}

export function getLevelAbove(level: UserLevel): UserLevel | null {
  const idx = levelIndex(level);
  return idx < USER_LEVEL_ORDER.length - 1 ? USER_LEVEL_ORDER[idx + 1] : null;
}

export function evaluateCondition(condition: UnlockCondition, progress: UserProgress): boolean {
  switch (condition.type) {
    case 'level': return levelIndex(progress.level) >= levelIndex(condition.value as UserLevel);
    case 'tutorial_completed': return progress.completedTutorials.includes(condition.value as string);
    case 'feature_used': return progress.usedFeatures.includes(condition.value as string);
    case 'command_run': return progress.runCommands.includes(condition.value as string);
    case 'time_spent_minutes': return progress.timeSpentMinutes >= (condition.value as number);
    case 'projects_created': return progress.projectsCreated >= (condition.value as number);
    case 'badge_earned': return progress.earnedBadges.includes(condition.value as string);
    default: return false;
  }
}

export function conditionProgress(condition: UnlockCondition, progress: UserProgress): number {
  switch (condition.type) {
    case 'level': {
      const required = condition.value as UserLevel;
      const current = levelIndex(progress.level);
      const needed = levelIndex(required);
      if (current >= needed) return 1;
      return needed > 0 ? current / needed : 0;
    }
    case 'tutorial_completed':
    case 'badge_earned': return progress.completedTutorials.includes(condition.value as string) ? 1 : 0;
    case 'feature_used': return progress.usedFeatures.includes(condition.value as string) ? 1 : 0;
    case 'command_run': return progress.runCommands.includes(condition.value as string) ? 1 : 0;
    case 'time_spent_minutes': return Math.min(1, progress.timeSpentMinutes / (condition.value as number));
    case 'projects_created': return Math.min(1, progress.projectsCreated / (condition.value as number));
    default: return 0;
  }
}

export function defaultProgress(): UserProgress {
  return {
    level: 'beginner', completedTutorials: [], usedFeatures: [], runCommands: [],
    timeSpentMinutes: 0, projectsCreated: 0, earnedBadges: [], discoveredFeatures: [],
  };
}
