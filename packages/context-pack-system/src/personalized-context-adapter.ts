import { PersonalizationConfig, DeveloperProfile } from './types';
import { createLogger } from '@ideia/logger';
import { ContextPackRegistry } from './context-pack-registry';
import { ContextInjector } from './context-pack-injector';
import { ResolvedPack } from './types';
const logger = createLogger('personalized-context-adapter');

export class PersonalizedContextAdapter {
  private _profiles = new Map<string, DeveloperProfile>();
  private _packSuccesses = new Map<
    string,
    Map<string, { successes: number; failures: number }>
  >();
  private _config: PersonalizationConfig;

  constructor(config: Partial<PersonalizationConfig> = {}) {
    this._config = {
      alpha: 1,
      beta: 1,
      explorationRate: 0.2,
      decayFactor: 0.95,
      windowSize: 100,
      minObservations: 5,
      ...config,
    };
  }

  getOrCreateProfile(
    developerId: string,
    initialData?: Partial<DeveloperProfile>
  ): DeveloperProfile {
    const existing = this._profiles.get(developerId);
    if (existing) return existing;

    const profile: DeveloperProfile = {
      developerId,
      team: initialData?.team || 'default',
      role: initialData?.role || 'developer',
      preferredPacks: new Map(),
      avoidedPacks: new Set(),
      contextLengthPreference: initialData?.contextLengthPreference || 'balanced',
      languagePreference: initialData?.languagePreference || [],
      frameworkPreference: initialData?.frameworkPreference || [],
    };
    this._profiles.set(developerId, profile);
    return profile;
  }

  private _thompsonSample(packName: string, developerId: string): number {
    const devKey = `${developerId}:${packName}`;
    if (!this._packSuccesses.has(devKey)) {
      this._packSuccesses.set(devKey, new Map());
    }
    const stats = this._packSuccesses.get(devKey) as Map<string, { successes: number; failures: number }>;

    let totalSuccesses = 0;
    let totalFailures = 0;
    for (const [, s] of stats) {
      totalSuccesses += s.successes;
      totalFailures += s.failures;
    }

    const alpha = this._config.alpha + totalSuccesses;
    const beta = this._config.beta + totalFailures;

    return this._sampleBeta(alpha, beta);
  }

  private _sampleBeta(alpha: number, beta: number): number {
    let x = 0;
    let y = 0;
    for (let i = 0; i < Math.ceil(alpha); i++) {
      x += -Math.log(Math.random() + 1e-10);
    }
    for (let i = 0; i < Math.ceil(beta); i++) {
      y += -Math.log(Math.random() + 1e-10);
    }
    return x / (x + y);
  }

  selectPacks(
    _taskType: string,
    developerId: string,
    availablePacks: string[],
    budget: number
  ): string[] {
    const profile = this.getOrCreateProfile(developerId);
    const selected: string[] = [];
    let remainingBudget = budget;

    const scoredPacks = availablePacks.map(packName => {
      const thompsonScore = this._thompsonSample(packName, developerId);

      let personalizationBoost = 0;
      const prefValue = profile.preferredPacks.get(packName);
      if (prefValue !== undefined) personalizationBoost += 0.2 * prefValue;
      if (profile.avoidedPacks.has(packName)) personalizationBoost -= 0.3;

      const devKey = `${developerId}:${packName}`;
      const stats = this._packSuccesses.get(devKey);
      let observations = 0;
      if (stats) {
        for (const [, s] of stats) observations += s.successes + s.failures;
      }
      const explorationBonus =
        observations < this._config.minObservations
          ? this._config.explorationRate *
            (1 - observations / this._config.minObservations)
          : 0;

      const recency = Math.min(1, observations / this._config.windowSize);

      const finalScore =
        thompsonScore * 0.5 +
        personalizationBoost * 0.25 +
        explorationBonus * 0.15 +
        recency * 0.1;
      return { packName, score: finalScore };
    });

    scoredPacks.sort((a, b) => b.score - a.score);

    for (const sp of scoredPacks) {
      if (remainingBudget <= 0) break;
      selected.push(sp.packName);
      remainingBudget--;
    }

    return selected;
  }

  async recordOutcome(
    developerId: string,
    packName: string,
    contextKey: string,
    success: boolean
  ): Promise<void> {
    const devKey = `${developerId}:${packName}`;
    if (!this._packSuccesses.has(devKey)) {
      this._packSuccesses.set(devKey, new Map());
    }

    const devStats = this._packSuccesses.get(devKey) as Map<string, { successes: number; failures: number }>;
    const existing = devStats.get(contextKey);
    if (!existing) {
      devStats.set(contextKey, { successes: 0, failures: 0 });
    }
    const stats = devStats.get(contextKey) as { successes: number; failures: number };
    if (success) stats.successes++;
    else stats.failures++;

    const profile = this.getOrCreateProfile(developerId);
    const currentPref = profile.preferredPacks.get(packName) || 0;
    const newPref = currentPref * this._config.decayFactor + (success ? 0.1 : -0.05);
    if (newPref > 0.1) {
      profile.preferredPacks.set(packName, Math.min(1, newPref));
    } else if (newPref < -0.2) {
      profile.avoidedPacks.add(packName);
    }

    if (devStats.size > this._config.windowSize) {
      const oldestKey = devStats.keys().next().value;
      if (oldestKey !== undefined) devStats.delete(oldestKey);
    }
  }

  async getPersonalizedInjector(
    developerId: string,
    registry: ContextPackRegistry
  ): Promise<ContextInjector> {
    this.getOrCreateProfile(developerId);
    const injector = new ContextInjector({
      templateEngine: 'ejs',
      packSeparator: '\n\n---\n\n',
      includeSummary: true,
      tokenTolerance: 0.1,
      cacheTemplates: true,
    });

    const self = this;
    const originalInject = injector.inject.bind(injector);
    injector.inject = async (
      packs: ResolvedPack[],
      variables: Record<string, unknown>,
      maxTokens?: number
    ) => {
      const personalizedPackNames = self.selectPacks(
        (variables.task_type as string) || 'general',
        developerId,
        packs.map(rp => rp.pack.name),
        packs.length
      );

      const filteredPacks = packs.filter(rp =>
        personalizedPackNames.includes(rp.pack.name)
      );
      const result = await originalInject(filteredPacks, variables, maxTokens);

      for (const rp of filteredPacks) {
        await self.recordOutcome(developerId, rp.pack.name, 'injection', true);
      }

      return result;
    };

    return injector;
  }

  getProfile(developerId: string): DeveloperProfile | undefined {
    return this._profiles.get(developerId);
  }
}
