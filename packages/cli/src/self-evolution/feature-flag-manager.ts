export interface FeatureFlag {
  flagId: string;
  enabled: boolean;
  description: string;
}

export class FeatureFlagManager {
  private flags = new Map<string, FeatureFlag>();

  setFlag(flag: FeatureFlag): void {
    this.flags.set(flag.flagId, flag);
  }

  getFlag(flagId: string): FeatureFlag | undefined {
    return this.flags.get(flagId);
  }

  isEnabled(flagId: string): boolean {
    return this.flags.get(flagId)?.enabled ?? false;
  }

  list(): FeatureFlag[] {
    return [...this.flags.values()];
  }

  remove(flagId: string): void {
    this.flags.delete(flagId);
  }
}
