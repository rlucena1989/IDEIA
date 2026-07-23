import {
  UserLevel,
  FeatureId,
  UnlockCondition,
  FeatureDefinition,
  UserProgress,
  FeatureState,
  ProgressiveDisclosureProfile,
} from './types';

const USER_LEVEL_ORDER: UserLevel[] = ['beginner', 'intermediate', 'advanced', 'expert'];

function levelIndex(level: UserLevel): number {
  return USER_LEVEL_ORDER.indexOf(level);
}

function getLevelAbove(level: UserLevel): UserLevel | null {
  const idx = levelIndex(level);
  if (idx < USER_LEVEL_ORDER.length - 1) {
    return USER_LEVEL_ORDER[idx + 1];
  }
  return null;
}

function _meetsLevelCondition(condition: UnlockCondition, progress: UserProgress): boolean {
  if (condition.type !== 'level') return true;
  const requiredLevel = condition.value as UserLevel;
  return levelIndex(progress.level) >= levelIndex(requiredLevel);
}

function evaluateCondition(condition: UnlockCondition, progress: UserProgress): boolean {
  switch (condition.type) {
    case 'level':
      return levelIndex(progress.level) >= levelIndex(condition.value as UserLevel);
    case 'tutorial_completed':
      return progress.completedTutorials.includes(condition.value as string);
    case 'feature_used':
      return progress.usedFeatures.includes(condition.value as string);
    case 'command_run':
      return progress.runCommands.includes(condition.value as string);
    case 'time_spent_minutes':
      return progress.timeSpentMinutes >= (condition.value as number);
    case 'projects_created':
      return progress.projectsCreated >= (condition.value as number);
    case 'badge_earned':
      return progress.earnedBadges.includes(condition.value as string);
    default:
      return false;
  }
}

function conditionProgress(condition: UnlockCondition, progress: UserProgress): number {
  switch (condition.type) {
    case 'level': {
      const required = condition.value as UserLevel;
      const current = levelIndex(progress.level);
      const needed = levelIndex(required);
      if (current >= needed) return 1;
      return needed > 0 ? current / needed : 0;
    }
    case 'tutorial_completed':
    case 'badge_earned':
      return progress.completedTutorials.includes(condition.value as string) ? 1 : 0;
    case 'feature_used':
      return progress.usedFeatures.includes(condition.value as string) ? 1 : 0;
    case 'command_run':
      return progress.runCommands.includes(condition.value as string) ? 1 : 0;
    case 'time_spent_minutes':
      return Math.min(1, progress.timeSpentMinutes / (condition.value as number));
    case 'projects_created':
      return Math.min(1, progress.projectsCreated / (condition.value as number));
    default:
      return 0;
  }
}

function defaultProgress(): UserProgress {
  return {
    level: 'beginner',
    completedTutorials: [],
    usedFeatures: [],
    runCommands: [],
    timeSpentMinutes: 0,
    projectsCreated: 0,
    earnedBadges: [],
    discoveredFeatures: [],
  };
}

function builtInFeatures(): FeatureDefinition[] {
  return [
    {
      id: 'project-scaffold',
      name: 'Project Scaffold',
      description: 'Create new projects from templates',
      category: 'scaffolding',
      visibility: 'available',
      minLevel: 'beginner',
      unlockConditions: [{ type: 'level', value: 'beginner' }],
      dependsOn: [],
      hints: ['Try "ideia init" to create your first project', 'Explore available templates with "ideia template list"'],
      commandHint: 'ideia init --help',
      group: 'getting-started',
    },
    {
      id: 'cli-help',
      name: 'CLI Help System',
      description: 'Built-in help for all CLI commands',
      category: 'CLI',
      visibility: 'available',
      minLevel: 'beginner',
      unlockConditions: [{ type: 'level', value: 'beginner' }],
      dependsOn: [],
      hints: ['Use "ideia --help" to see all commands', 'Add --help to any command for details'],
      commandHint: 'ideia --help',
      group: 'getting-started',
    },
    {
      id: 'template-list',
      name: 'Template List',
      description: 'Browse available project templates',
      category: 'scaffolding',
      visibility: 'available',
      minLevel: 'beginner',
      unlockConditions: [{ type: 'level', value: 'beginner' }],
      dependsOn: [],
      hints: ['Run "ideia template list" to see options', 'Templates are categorized by stack and complexity'],
      commandHint: 'ideia template list',
      group: 'getting-started',
    },
    {
      id: 'basic-config',
      name: 'Basic Configuration',
      description: 'Configure IDEIA with a config file',
      category: 'CLI',
      visibility: 'available',
      minLevel: 'beginner',
      unlockConditions: [{ type: 'level', value: 'beginner' }],
      dependsOn: [],
      hints: ['Create ideia.json in your project root', 'See all options with "ideia config --help"'],
      commandHint: 'ideia config --help',
      group: 'getting-started',
    },
    {
      id: 'agent-chat',
      name: 'Agent Chat',
      description: 'Interactive chat with IDEIA agents',
      category: 'agents',
      visibility: 'discoverable',
      minLevel: 'intermediate',
      unlockConditions: [
        { type: 'level', value: 'beginner' },
        { type: 'command_run', value: 'ideia init' },
      ],
      dependsOn: ['project-scaffold'],
      hints: ['Start a chat with "ideia chat"', 'Agents can help you write code, debug, and plan'],
      commandHint: 'ideia chat --help',
      group: 'core-features',
    },
    {
      id: 'code-generation',
      name: 'Code Generation',
      description: 'Generate code from natural language',
      category: 'agents',
      visibility: 'locked',
      minLevel: 'intermediate',
      unlockConditions: [
        { type: 'level', value: 'intermediate' },
        { type: 'feature_used', value: 'agent-chat' },
      ],
      dependsOn: ['agent-chat'],
      hints: ['Describe what you want and IDEIA will generate the code', 'Be specific about language and framework'],
      commandHint: 'ideia generate "create a REST API"',
      group: 'core-features',
    },
    {
      id: 'git-integration',
      name: 'Git Integration',
      description: 'Git workflow automation',
      category: 'collaboration',
      visibility: 'discoverable',
      minLevel: 'intermediate',
      unlockConditions: [
        { type: 'level', value: 'intermediate' },
        { type: 'projects_created', value: 1 },
      ],
      dependsOn: ['project-scaffold'],
      hints: ['IDEIA can automate commit messages and PRs', 'Try "ideia git status" for a smart overview'],
      commandHint: 'ideia git --help',
      group: 'core-features',
    },
    {
      id: 'basic-monitoring',
      name: 'Basic Monitoring',
      description: 'Monitor project health and metrics',
      category: 'monitoring',
      visibility: 'locked',
      minLevel: 'intermediate',
      unlockConditions: [
        { type: 'level', value: 'intermediate' },
        { type: 'time_spent_minutes', value: 30 },
      ],
      dependsOn: [],
      hints: ['Run "ideia monitor" to see project metrics', 'Track build times, test coverage, and more'],
      commandHint: 'ideia monitor --help',
      group: 'monitoring',
    },
    {
      id: 'multi-agent',
      name: 'Multi-Agent Orchestration',
      description: 'Coordinate multiple agents for complex tasks',
      category: 'agents',
      visibility: 'locked',
      minLevel: 'advanced',
      unlockConditions: [
        { type: 'level', value: 'advanced' },
        { type: 'feature_used', value: 'code-generation' },
        { type: 'feature_used', value: 'agent-chat' },
      ],
      dependsOn: ['code-generation', 'agent-chat'],
      hints: ['Chain agents together for complex workflows', 'Agents can delegate tasks to each other'],
      commandHint: 'ideia workflow create --help',
      group: 'advanced',
    },
    {
      id: 'custom-agent',
      name: 'Custom Agent Builder',
      description: 'Create and train custom agents',
      category: 'agents',
      visibility: 'locked',
      minLevel: 'advanced',
      unlockConditions: [
        { type: 'level', value: 'advanced' },
        { type: 'feature_used', value: 'multi-agent' },
      ],
      dependsOn: ['multi-agent'],
      hints: ['Define custom agent behaviors with YAML config', 'Train agents on your codebase patterns'],
      commandHint: 'ideia agent create --help',
      group: 'advanced',
    },
    {
      id: 'security-scan',
      name: 'Security Scan',
      description: 'Automated security vulnerability scanning',
      category: 'security',
      visibility: 'discoverable',
      minLevel: 'advanced',
      unlockConditions: [
        { type: 'level', value: 'advanced' },
        { type: 'projects_created', value: 3 },
      ],
      dependsOn: [],
      hints: ['Scan your project for known vulnerabilities', 'Get remediation suggestions for each finding'],
      commandHint: 'ideia security scan',
      group: 'security',
    },
    {
      id: 'performance-profiler',
      name: 'Performance Profiler',
      description: 'Profile and optimize application performance',
      category: 'monitoring',
      visibility: 'locked',
      minLevel: 'advanced',
      unlockConditions: [
        { type: 'level', value: 'advanced' },
        { type: 'feature_used', value: 'basic-monitoring' },
      ],
      dependsOn: ['basic-monitoring'],
      hints: ['Profile your app to find bottlenecks', 'Get optimization suggestions with benchmark data'],
      commandHint: 'ideia profile --help',
      group: 'monitoring',
    },
    {
      id: 'deployment-pipeline',
      name: 'Deployment Pipeline',
      description: 'CI/CD pipeline setup and management',
      category: 'deployment',
      visibility: 'locked',
      minLevel: 'advanced',
      unlockConditions: [
        { type: 'level', value: 'advanced' },
        { type: 'projects_created', value: 2 },
      ],
      dependsOn: ['git-integration'],
      hints: ['Automated builds, tests, and deploys', 'Supports GitHub Actions, GitLab CI, and more'],
      commandHint: 'ideia pipeline init',
      group: 'deployment',
    },
    {
      id: 'team-collab',
      name: 'Team Collaboration',
      description: 'Multi-user project collaboration features',
      category: 'collaboration',
      visibility: 'locked',
      minLevel: 'advanced',
      unlockConditions: [
        { type: 'level', value: 'advanced' },
        { type: 'feature_used', value: 'git-integration' },
      ],
      dependsOn: ['git-integration'],
      hints: ['Invite team members to your project', 'Shared agents and configuration across the team'],
      commandHint: 'ideia team --help',
      group: 'collaboration',
    },
    {
      id: 'auto-healing',
      name: 'Auto-Healing',
      description: 'Automatic issue detection and recovery',
      category: 'monitoring',
      visibility: 'hidden',
      minLevel: 'expert',
      unlockConditions: [
        { type: 'level', value: 'expert' },
        { type: 'feature_used', value: 'performance-profiler' },
        { type: 'feature_used', value: 'basic-monitoring' },
      ],
      dependsOn: ['performance-profiler', 'basic-monitoring'],
      hints: ['IDEIA can automatically fix common issues', 'Self-healing reduces downtime and manual intervention'],
      commandHint: 'ideia heal --help',
      group: 'expert',
    },
    {
      id: 'custom-security-policy',
      name: 'Custom Security Policy',
      description: 'Define and enforce custom security policies',
      category: 'security',
      visibility: 'hidden',
      minLevel: 'expert',
      unlockConditions: [
        { type: 'level', value: 'expert' },
        { type: 'feature_used', value: 'security-scan' },
        { type: 'badge_earned', value: 'security-master' },
      ],
      dependsOn: ['security-scan'],
      hints: ['Create custom policy files for your org', 'Enforce compliance across all projects'],
      commandHint: 'ideia policy create --help',
      group: 'security',
    },
    {
      id: 'canary-deploy',
      name: 'Canary Deployments',
      description: 'Progressive delivery with canary releases',
      category: 'deployment',
      visibility: 'hidden',
      minLevel: 'expert',
      unlockConditions: [
        { type: 'level', value: 'expert' },
        { type: 'feature_used', value: 'deployment-pipeline' },
      ],
      dependsOn: ['deployment-pipeline'],
      hints: ['Roll out to 10%, 50%, then 100% of users', 'Automatic rollback on error threshold exceeded'],
      commandHint: 'ideia deploy canary --help',
      group: 'deployment',
    },
    {
      id: 'chaos-engineering',
      name: 'Chaos Engineering',
      description: 'Resilience testing through controlled failures',
      category: 'deployment',
      visibility: 'hidden',
      minLevel: 'expert',
      unlockConditions: [
        { type: 'level', value: 'expert' },
        { type: 'feature_used', value: 'canary-deploy' },
      ],
      dependsOn: ['canary-deploy'],
      hints: ['Test system resilience under failure conditions', 'Run chaos experiments in staging environments'],
      commandHint: 'ideia chaos run --help',
      group: 'deployment',
    },
    {
      id: 'cross-project-learning',
      name: 'Cross-Project Learning',
      description: 'Apply patterns and knowledge across projects',
      category: 'agents',
      visibility: 'hidden',
      minLevel: 'expert',
      unlockConditions: [
        { type: 'level', value: 'expert' },
        { type: 'projects_created', value: 5 },
        { type: 'tutorial_completed', value: 'advanced-agent-training' },
      ],
      dependsOn: ['custom-agent'],
      hints: ['IDEIA learns from all your projects', 'Patterns detected in one project are suggested in others'],
      commandHint: 'ideia learn --help',
      group: 'expert',
    },
  ];
}

export class ProgressiveDisclosure {
  private features: Map<FeatureId, FeatureDefinition>;
  private userProgress: UserProgress;

  constructor(initialProgress?: Partial<UserProgress>) {
    this.features = new Map();
    for (const f of builtInFeatures()) {
      this.features.set(f.id, f);
    }
    this.userProgress = { ...defaultProgress(), ...initialProgress };
  }

  registerFeature(feature: FeatureDefinition): void {
    this.features.set(feature.id, feature);
  }

  updateProgress(update: Partial<UserProgress>): void {
    this.userProgress = {
      ...this.userProgress,
      ...update,
      completedTutorials: update.completedTutorials ?? this.userProgress.completedTutorials,
      usedFeatures: update.usedFeatures ?? this.userProgress.usedFeatures,
      runCommands: update.runCommands ?? this.userProgress.runCommands,
      earnedBadges: update.earnedBadges ?? this.userProgress.earnedBadges,
      discoveredFeatures: update.discoveredFeatures ?? this.userProgress.discoveredFeatures,
    };
  }

  getFeatureState(id: FeatureId): FeatureState {
    const feature = this.features.get(id);
    if (!feature) {
      return {
        feature: { id, name: id, description: '', category: '', visibility: 'hidden', minLevel: 'beginner', unlockConditions: [], dependsOn: [], hints: [] },
        state: 'hidden',
        reason: 'Unknown feature',
        unlockProgress: 0,
      };
    }

    const isDiscovered = this.userProgress.discoveredFeatures.includes(feature.id);

    if (isDiscovered) {
      return {
        feature,
        state: 'highlighted',
        reason: 'Feature unlocked by discovery',
        unlockProgress: 1,
        nextHint: feature.hints[0],
      };
    }

    const allConditions = [...feature.unlockConditions];

    const depReasons: string[] = [];
    for (const depId of feature.dependsOn) {
      const depState = this.getFeatureState(depId);
      if (depState.state !== 'available' && depState.state !== 'discoverable' && depState.state !== 'highlighted') {
        depReasons.push(`Requires: ${depState.feature.name} (${depState.state})`);
      }
    }

    const conditionsMet = allConditions.every(c => evaluateCondition(c, this.userProgress));

    const levelCondition = allConditions.find(c => c.type === 'level');
    const levelMet = levelCondition ? evaluateCondition(levelCondition, this.userProgress) : true;

    if (!levelMet && depReasons.length > 0) {
      const allLocksMet = allConditions.every(c => c.type === 'level' || evaluateCondition(c, this.userProgress));
      const depLocksMet = feature.dependsOn.every(depId => {
        const depState = this.getFeatureState(depId);
        return depState.state === 'available' || depState.state === 'discoverable' || depState.state === 'highlighted';
      });
      if (!allLocksMet && !depLocksMet) {
        const progress = Math.min(
          ...allConditions.map(c => conditionProgress(c, this.userProgress)),
          ...(feature.dependsOn.length > 0 ? [0] : [1])
        );
        return {
          feature,
          state: 'locked',
          reason: `Level ${feature.minLevel} required. ${depReasons.join('; ')}`,
          unlockProgress: progress,
          nextHint: feature.hints[0],
        };
      }
    }

    if (!levelMet) {
      const progress = Math.min(...allConditions.map(c => conditionProgress(c, this.userProgress)));
      return {
        feature,
        state: 'locked',
        reason: `Level ${feature.minLevel} required. Current: ${this.userProgress.level}`,
        unlockProgress: progress,
        nextHint: feature.hints[0],
      };
    }

    if (!conditionsMet) {
      const progress = Math.min(...allConditions.map(c => conditionProgress(c, this.userProgress)));
      const unmet = allConditions.find(c => !evaluateCondition(c, this.userProgress));
      const reason = unmet ? `Condition not met: ${unmet.type} = ${unmet.value}${unmet.description ? ` (${unmet.description})` : ''}` : 'Some conditions not met';
      return {
        feature,
        state: 'locked',
        reason,
        unlockProgress: progress,
        nextHint: feature.hints[0],
      };
    }

    if (depReasons.length > 0) {
      const progress = Math.min(...allConditions.map(c => conditionProgress(c, this.userProgress)));
      return {
        feature,
        state: 'locked',
        reason: depReasons.join('; '),
        unlockProgress: progress,
        nextHint: feature.hints[0],
      };
    }

    if (feature.visibility === 'hidden') {
      return {
        feature,
        state: 'hidden',
        reason: 'Feature is not yet discoverable at your level',
        unlockProgress: 1,
      };
    }

    if (feature.visibility === 'highlighted') {
      return {
        feature,
        state: 'highlighted',
        reason: 'Recommended feature for your level',
        unlockProgress: 1,
        nextHint: feature.hints[0],
      };
    }

    if (feature.visibility === 'discoverable') {
      return {
        feature,
        state: 'discoverable',
        reason: 'New feature available for exploration',
        unlockProgress: 1,
        nextHint: feature.hints[0],
      };
    }

    return {
      feature,
      state: 'available',
      reason: 'Feature is available',
      unlockProgress: 1,
      nextHint: feature.hints[0],
    };
  }

  getProfile(): ProgressiveDisclosureProfile {
    const allFeatures = Array.from(this.features.values());
    const allStates = allFeatures.map(f => this.getFeatureState(f.id));

    const visibleFeatures = allStates.filter(s => s.state === 'available' || s.state === 'highlighted');
    const lockedFeatures = allStates.filter(s => s.state === 'locked');
    const discoveredFeatures = allStates.filter(s => s.state === 'discoverable');

    const nextRecommended = this.getNextRecommendedFeature();
    const overallProgress = this.getOverallProgress();

    return {
      userLevel: this.userProgress.level,
      visibleFeatures,
      lockedFeatures,
      discoveredFeatures,
      nextRecommendedFeature: nextRecommended ?? undefined,
      overallProgress,
    };
  }

  getVisibleFeatures(): FeatureState[] {
    return Array.from(this.features.values())
      .map(f => this.getFeatureState(f.id))
      .filter(s => s.state === 'available' || s.state === 'discoverable' || s.state === 'highlighted');
  }

  getLockedFeatures(): FeatureState[] {
    return Array.from(this.features.values())
      .map(f => this.getFeatureState(f.id))
      .filter(s => s.state === 'locked');
  }

  getDiscoverableFeatures(): FeatureState[] {
    return Array.from(this.features.values())
      .map(f => this.getFeatureState(f.id))
      .filter(s => s.state === 'discoverable');
  }

  getNextRecommendedFeature(): FeatureState | null {
    const locked = this.getLockedFeatures();
    const sorted = locked.sort((a, b) => b.unlockProgress - a.unlockProgress);
    if (sorted.length > 0 && sorted[0].unlockProgress > 0) {
      return sorted[0];
    }
    const discoverable = this.getDiscoverableFeatures();
    if (discoverable.length > 0) {
      return discoverable[0];
    }
    return null;
  }

  unlockFeature(id: FeatureId): boolean {
    const feature = this.features.get(id);
    if (!feature) return false;
    if (!this.userProgress.discoveredFeatures.includes(id)) {
      this.userProgress.discoveredFeatures.push(id);
    }
    if (!this.userProgress.usedFeatures.includes(id)) {
      this.userProgress.usedFeatures.push(id);
    }
    return true;
  }

  getOverallProgress(): number {
    const featuresForLevel = Array.from(this.features.values()).filter(f => {
      const levelCond = f.unlockConditions.find(c => c.type === 'level');
      if (!levelCond) return true;
      return levelIndex(levelCond.value as UserLevel) <= levelIndex(this.userProgress.level);
    });

    if (featuresForLevel.length === 0) return 1;

    let totalProgress = 0;
    for (const feature of featuresForLevel) {
      const state = this.getFeatureState(feature.id);
      if (state.state === 'available' || state.state === 'highlighted' || state.state === 'discoverable') {
        totalProgress += 1;
      } else {
        totalProgress += state.unlockProgress;
      }
    }

    return totalProgress / featuresForLevel.length;
  }

  advanceLevel(): UserLevel | null {
    const next = getLevelAbove(this.userProgress.level);
    if (!next) return null;

    const featuresForNext = Array.from(this.features.values()).filter(f => {
      const levelCond = f.unlockConditions.find(c => c.type === 'level');
      return levelCond && (levelCond.value as UserLevel) === next;
    });

    for (const feature of featuresForNext) {
      const state = this.getFeatureState(feature.id);
      if (state.state === 'locked') {
        return null;
      }
    }

    const overall = this.getOverallProgress();
    if (overall < 0.8) return null;

    this.userProgress.level = next;
    return next;
  }

  getLevelProgress(current: UserLevel): { current: UserLevel; next: UserLevel | null; progress: number; conditions: string[] } {
    const next = getLevelAbove(current);
    const conditions: string[] = [];

    const featuresForNext = Array.from(this.features.values()).filter(f => {
      const levelCond = f.unlockConditions.find(c => c.type === 'level');
      return levelCond && (levelCond.value as UserLevel) === next;
    });

    for (const feature of featuresForNext) {
      const state = this.getFeatureState(feature.id);
      if (state.state === 'locked') {
        conditions.push(state.reason);
      }
    }

    const overall = this.getOverallProgress();

    return { current, next, progress: overall, conditions };
  }

  getFeaturesByGroup(group: string): FeatureState[] {
    return Array.from(this.features.values())
      .filter(f => f.group === group)
      .map(f => this.getFeatureState(f.id));
  }

  resetProgress(): void {
    this.userProgress = defaultProgress();
  }
}
