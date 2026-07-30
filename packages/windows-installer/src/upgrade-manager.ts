export interface UpgradePath {
  fromVersion: string;
  toVersion: string;
  type: 'major' | 'minor' | 'patch';
  breaking: boolean;
  migrationSteps: string[];
}

export class UpgradeManager {
  private paths: UpgradePath[] = [];

  addPath(path: UpgradePath): void {
    this.paths.push(path);
  }

  getPath(from: string, to: string): UpgradePath | undefined {
    return this.paths.find(p => p.fromVersion === from && p.toVersion === to);
  }

  getUpgradeChain(fromVersion: string, toVersion: string): UpgradePath[] {
    const chain: UpgradePath[] = [];
    let current = fromVersion;
    while (current !== toVersion) {
      const next = this.paths.find(p => p.fromVersion === current);
      if (!next) break;
      chain.push(next);
      current = next.toVersion;
      if (chain.length > 100) break;
    }
    return chain;
  }

  hasBreakingChanges(fromVersion: string, toVersion: string): boolean {
    const chain = this.getUpgradeChain(fromVersion, toVersion);
    return chain.some(p => p.breaking);
  }

  getLatestVersion(): string {
    const versions = this.paths.map(p => p.toVersion).sort().reverse();
    return versions[0] || '0.0.0';
  }
}
