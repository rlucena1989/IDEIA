export type ReleasePhase = 'sanity-check' | 'build' | 'sign' | 'package' | 'publish' | 'verify' | 'rollback-on-failure';

export interface ReleaseConfig {
  version: string;
  platforms: string[];
  channel: 'alpha' | 'beta' | 'stable';
  dryRun: boolean;
  qualityGateTimeoutMs: number;
  signArtifacts: boolean;
  notarizeMacOS: boolean;
}

export interface ReleaseResult {
  success: boolean;
  version: string;
  phases: { phase: ReleasePhase; status: 'passed' | 'failed' | 'skipped'; durationMs: number }[];
  artifactUrls: string[];
  releaseUrl: string | null;
  error: string | null;
  startedAt: string;
  completedAt: string;
}

export class ReleaseOrchestrator {
  private _config: ReleaseConfig;
  private _phases: ReleasePhase[];
  private _results: ReleaseResult['phases'] = [];

  constructor(config: Partial<ReleaseConfig>) {
    this._config = { ...this._getDefaultConfig(), ...config };
    this._phases = [...this._getDefaultPhases()];
    if (this._config.channel === 'alpha') {
      this._phases = this._phases.filter(p => p !== 'sign');
    }
  }

  async execute(): Promise<ReleaseResult> {
    this._validateConfig();
    const startedAt = new Date().toISOString();
    this._results = [];

    for (const phase of this._phases) {
      const phaseStart = Date.now();
      const success = await this._runPhase(phase);
      const durationMs = Date.now() - phaseStart;

      this._results.push({
        phase,
        status: success ? 'passed' : 'failed',
        durationMs,
      });

      if (!success) {
        break;
      }
    }

    const overallSuccess = this._results.every(r => r.status === 'passed');

    return {
      success: overallSuccess,
      version: this._config.version,
      phases: this._results,
      artifactUrls: [],
      releaseUrl: null,
      error: overallSuccess ? null : 'Release failed during execution',
      startedAt,
      completedAt: new Date().toISOString(),
    };
  }

  private _getDefaultConfig(): ReleaseConfig {
    return {
      version: '',
      platforms: ['win-x64', 'mac-arm64', 'linux-x64'],
      channel: 'alpha',
      dryRun: true,
      qualityGateTimeoutMs: 300000,
      signArtifacts: false,
      notarizeMacOS: false,
    };
  }

  private _getDefaultPhases(): ReleasePhase[] {
    return ['sanity-check', 'build', 'sign', 'package', 'publish', 'verify'];
  }

  private _validateConfig(): void {
    if (!this._config.version) {
      throw new Error('ReleaseConfig.version is required');
    }
    if (!this._config.platforms || this._config.platforms.length === 0) {
      throw new Error('ReleaseConfig.platforms must have at least one platform');
    }
  }

  private async _runPhase(_phase: ReleasePhase): Promise<boolean> {
    if (this._config.dryRun) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 50));
    return true;
  }
}
