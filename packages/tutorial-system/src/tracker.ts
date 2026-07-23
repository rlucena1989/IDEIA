import { TutorialProgress, TutorialId, UserId, Badge } from './types';

interface StoredProgress {
  userId: UserId;
  tutorials: Map<TutorialId, TutorialProgress>;
  badges: Badge[];
}

export class ProgressTracker {
  private store: Map<UserId, StoredProgress> = new Map();

  saveProgress(progress: TutorialProgress): void {
    const userId = this.resolveUserId(progress.tutorialId);
    let sp = this.store.get(userId);
    if (!sp) {
      sp = { userId, tutorials: new Map(), badges: [] };
      this.store.set(userId, sp);
    }
    sp.tutorials.set(progress.tutorialId, progress);
  }

  getProgress(userId: UserId, tutorialId: TutorialId): TutorialProgress | undefined {
    const sp = this.store.get(userId);
    return sp?.tutorials.get(tutorialId);
  }

  getAllProgress(userId: UserId): TutorialProgress[] {
    const sp = this.store.get(userId);
    return sp ? Array.from(sp.tutorials.values()) : [];
  }

  getCompletionRate(tutorialId: TutorialId): number {
    let started = 0;
    let completed = 0;
    for (const sp of this.store.values()) {
      const p = sp.tutorials.get(tutorialId);
      if (p) {
        started++;
        if (p.completed) completed++;
      }
    }
    return started > 0 ? completed / started : 0;
  }

  getBadges(userId: UserId): Badge[] {
    const sp = this.store.get(userId);
    return sp?.badges ?? [];
  }

  resetProgress(userId: UserId, tutorialId: TutorialId): void {
    const sp = this.store.get(userId);
    if (sp) {
      sp.tutorials.delete(tutorialId);
    }
  }

  awardBadge(userId: UserId, badge: Badge): void {
    let sp = this.store.get(userId);
    if (!sp) {
      sp = { userId, tutorials: new Map(), badges: [] };
      this.store.set(userId, sp);
    }
    if (!sp.badges.find(b => b.id === badge.id)) {
      sp.badges.push(badge);
    }
  }

  private resolveUserId(_tutorialId: TutorialId): UserId {
    return 'default-user';
  }
}
