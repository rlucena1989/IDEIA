import { BanditArm, Goal } from './types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('bandit-plan-selector');

export class BanditPlanSelector {
  private _arms = new Map<string, BanditArm>();
  private _totalPlays = 0;
  private _alpha = 0.1;

  registerStrategy(name: string): void {
    this._arms.set(name, { name, plays: 0, totalReward: 0, meanReward: 0, lastPlayed: 0 });
  }

  select(_query: Goal): string {
    const candidates = Array.from(this._arms.values());
    if (candidates.some(a => a.plays < 5)) {
      const unexplored = candidates.filter(a => a.plays < 5);
      return unexplored[Math.floor(Math.random() * unexplored.length)].name;
    }
    const ucbScores = candidates.map(a => ({
      name: a.name,
      score: a.meanReward + this._alpha * Math.sqrt(Math.log(this._totalPlays + 1) / (a.plays + 1)),
    }));
    ucbScores.sort((a, b) => b.score - a.score);
    return ucbScores[0].name;
  }

  observe(strategy: string, reward: number): void {
    const arm = this._arms.get(strategy);
    if (!arm) return;
    arm.plays++;
    arm.totalReward += reward;
    arm.meanReward = arm.totalReward / arm.plays;
    arm.lastPlayed = Date.now();
    this._totalPlays++;
  }

  getBestStrategy(): { name: string; meanReward: number } | null {
    const sorted = Array.from(this._arms.values()).sort((a, b) => b.meanReward - a.meanReward);
    return sorted.length > 0 ? { name: sorted[0].name, meanReward: sorted[0].meanReward } : null;
  }

  getRegret(): number {
    if (this._totalPlays === 0) return 0;
    const bestMean = Math.max(...Array.from(this._arms.values()).map(a => a.meanReward));
    let totalRegret = 0;
    for (const arm of this._arms.values()) {
      totalRegret += arm.plays * (bestMean - arm.meanReward);
    }
    return totalRegret;
  }

  getArmStats(): BanditArm[] {
    return Array.from(this._arms.values());
  }
}
