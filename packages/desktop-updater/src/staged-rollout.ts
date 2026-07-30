export class StagedRolloutManager {
  private static readonly ROLLOUT_STEPS = [5, 10, 25, 50, 100];

  isEligible(clientId: string, rolloutPercent: number): boolean {
    if (rolloutPercent >= 100) return true;
    const hash = this.hashClient(clientId);
    return hash <= rolloutPercent;
  }

  getNextRolloutPercent(currentPercent: number, crashRate: number): number {
    if (crashRate > 0.005) return currentPercent;
    const stepIndex = StagedRolloutManager.ROLLOUT_STEPS.findIndex(s => s > currentPercent);
    if (stepIndex === -1) return 100;
    return StagedRolloutManager.ROLLOUT_STEPS[stepIndex];
  }

  private hashClient(clientId: string): number {
    let hash = 0;
    for (let i = 0; i < clientId.length; i++) {
      const char = clientId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }
}
