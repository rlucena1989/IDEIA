import type { ProfileConfig, FullConfig } from './config-types';
import type { ProfileId } from './types';
import { validate } from './config-validator';
import { AuditTrail } from '@ideia/audit-trail';
import { EventBus } from '@ideia/event-bus';

const defaultScanner = (enabled: boolean, interval?: string) => ({
  enabled, interval: interval ?? '15m', severity: 'warning' as const, failOnError: false,
});

const soloDevConfig: FullConfig = {
  autonomy: {
    level: 'assisted',
    riskThreshold: 'low',
    autoFixCategories: ['style', 'docs', 'refactor'],
    confirmBeforeWrite: true,
    autoContinueAfter: 5,
    autoDecideOnMatch: 8,
    maxConsecutiveActions: 5,
  },
  scanners: {
    codeQuality: defaultScanner(true, '10m'),
    security: defaultScanner(true, '5m'),
    performance: defaultScanner(false),
    accessibility: defaultScanner(false),
    dependencies: defaultScanner(true, '30m'),
    secrets: defaultScanner(true, '5m'),
    coverage: defaultScanner(true, '15m'),
    style: defaultScanner(true, '10m'),
    docs: defaultScanner(true, '20m'),
    infra: defaultScanner(false),
  },
  bhp: {
    preferredPatterns: ['functional', 'modular', 'typed'],
    avoidedPatterns: ['magic-strings', 'any-types', 'deep-nesting'],
    learningRate: 0.3,
    adaptationStyle: 'conservative',
    feedbackThreshold: 0.6,
    patternMemorySize: 100,
  },
  continuity: {
    maxSessionDuration: 14400,
    idleTimeout: 600,
    saveInterval: 30,
    restoreOnStartup: true,
    checkpointStrategy: 'periodic',
    sessionPersistence: true,
    crashRecovery: true,
  },
  safety: {
    maxTokensPerAction: 8000,
    requireApprovalFor: ['delete', 'install', 'network'],
    allowedPaths: ['.'],
    blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'],
    maxConcurrentOps: 1,
    sandboxLevel: 'basic',
    outputValidation: true,
    promptGuardrails: true,
  },
  ui: {
    theme: 'dark',
    fontSize: 14,
    layout: 'default',
    showMiniMap: true,
    confirmDialogs: true,
    denseMode: false,
    showStatusBar: true,
  },
  notifications: {
    channels: ['toast', 'terminal'],
    quietHours: null,
    urgencyFilter: { min: 1, max: 10 },
    onError: 'always',
    onComplete: 'summary',
    onWarning: 'summary',
    rateLimit: 50,
  },
  telemetry: {
    enabled: true,
    level: 'standard',
    retentionDays: 30,
    anonymize: true,
    metricsPath: null,
    includeStackTraces: false,
  },
  advanced: {
    experimentalFeatures: false,
    debugMode: false,
    logLevel: 'info',
    pluginAllowList: [],
    networkProxy: null,
    customEnv: {},
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

const techLeadConfig: FullConfig = {
  autonomy: {
    level: 'autonomous',
    riskThreshold: 'medium',
    autoFixCategories: ['style', 'docs', 'refactor', 'performance', 'security'],
    confirmBeforeWrite: false,
    autoContinueAfter: 3,
    autoDecideOnMatch: 6,
    maxConsecutiveActions: 10,
  },
  scanners: {
    codeQuality: defaultScanner(true, '5m'),
    security: defaultScanner(true, '3m'),
    performance: defaultScanner(true, '10m'),
    accessibility: defaultScanner(true, '30m'),
    dependencies: defaultScanner(true, '15m'),
    secrets: defaultScanner(true, '3m'),
    coverage: defaultScanner(true, '10m'),
    style: defaultScanner(true, '10m'),
    docs: defaultScanner(true, '15m'),
    infra: defaultScanner(true, '30m'),
  },
  bhp: {
    preferredPatterns: ['architected', 'performant', 'testable', 'observable'],
    avoidedPatterns: ['hardcoded-config', 'tight-coupling', 'duplication', 'god-objects'],
    learningRate: 0.5,
    adaptationStyle: 'balanced',
    feedbackThreshold: 0.5,
    patternMemorySize: 500,
  },
  continuity: {
    maxSessionDuration: 28800,
    idleTimeout: 300,
    saveInterval: 15,
    restoreOnStartup: true,
    checkpointStrategy: 'both',
    sessionPersistence: true,
    crashRecovery: true,
  },
  safety: {
    maxTokensPerAction: 16000,
    requireApprovalFor: ['delete', 'network'],
    allowedPaths: ['.'],
    blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'],
    maxConcurrentOps: 3,
    sandboxLevel: 'basic',
    outputValidation: true,
    promptGuardrails: true,
  },
  ui: {
    theme: 'dark',
    fontSize: 13,
    layout: 'default',
    showMiniMap: true,
    confirmDialogs: false,
    denseMode: true,
    showStatusBar: true,
  },
  notifications: {
    channels: ['toast', 'terminal', 'email'],
    quietHours: { start: '22:00', end: '07:00' },
    urgencyFilter: { min: 3, max: 10 },
    onError: 'always',
    onComplete: 'summary',
    onWarning: 'summary',
    rateLimit: 100,
  },
  telemetry: {
    enabled: true,
    level: 'standard',
    retentionDays: 60,
    anonymize: true,
    metricsPath: '.ideia/metrics',
    includeStackTraces: true,
  },
  advanced: {
    experimentalFeatures: false,
    debugMode: false,
    logLevel: 'info',
    pluginAllowList: ['eslint', 'prettier', 'jest'],
    networkProxy: null,
    customEnv: {},
    maxRetries: 3,
    retryDelayMs: 500,
  },
};

const automatorConfig: FullConfig = {
  autonomy: {
    level: 'autonomous',
    riskThreshold: 'high',
    autoFixCategories: ['style', 'docs', 'refactor', 'performance', 'security', 'dependencies', 'infra'],
    confirmBeforeWrite: false,
    autoContinueAfter: 1,
    autoDecideOnMatch: 3,
    maxConsecutiveActions: 20,
  },
  scanners: {
    codeQuality: defaultScanner(true, '2m'),
    security: defaultScanner(true, '2m'),
    performance: defaultScanner(true, '5m'),
    accessibility: defaultScanner(false),
    dependencies: defaultScanner(true, '10m'),
    secrets: defaultScanner(true, '2m'),
    coverage: defaultScanner(true, '5m'),
    style: defaultScanner(true, '5m'),
    docs: defaultScanner(true, '10m'),
    infra: defaultScanner(true, '15m'),
  },
  bhp: {
    preferredPatterns: ['automated', 'ci-driven', 'repeatable', 'idempotent'],
    avoidedPatterns: ['manual-steps', 'interactive-only', 'stateful', 'race-conditions'],
    learningRate: 0.8,
    adaptationStyle: 'aggressive',
    feedbackThreshold: 0.3,
    patternMemorySize: 1000,
  },
  continuity: {
    maxSessionDuration: 43200,
    idleTimeout: 120,
    saveInterval: 10,
    restoreOnStartup: true,
    checkpointStrategy: 'both',
    sessionPersistence: true,
    crashRecovery: true,
  },
  safety: {
    maxTokensPerAction: 32000,
    requireApprovalFor: ['delete'],
    allowedPaths: ['.'],
    blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'],
    maxConcurrentOps: 5,
    sandboxLevel: 'basic',
    outputValidation: true,
    promptGuardrails: true,
  },
  ui: {
    theme: 'dark',
    fontSize: 12,
    layout: 'compact',
    showMiniMap: false,
    confirmDialogs: false,
    denseMode: true,
    showStatusBar: false,
  },
  notifications: {
    channels: ['terminal'],
    quietHours: null,
    urgencyFilter: { min: 5, max: 10 },
    onError: 'summary',
    onComplete: 'never',
    onWarning: 'never',
    rateLimit: 200,
  },
  telemetry: {
    enabled: true,
    level: 'verbose',
    retentionDays: 90,
    anonymize: false,
    metricsPath: '.ideia/metrics',
    includeStackTraces: true,
  },
  advanced: {
    experimentalFeatures: true,
    debugMode: false,
    logLevel: 'debug',
    pluginAllowList: ['eslint', 'prettier', 'jest', 'webpack', 'docker'],
    networkProxy: null,
    customEnv: { CI: 'true' },
    maxRetries: 5,
    retryDelayMs: 200,
  },
};

const enterpriseConfig: FullConfig = {
  autonomy: {
    level: 'assisted',
    riskThreshold: 'low',
    autoFixCategories: ['style', 'docs', 'refactor', 'security'],
    confirmBeforeWrite: true,
    autoContinueAfter: 10,
    autoDecideOnMatch: 12,
    maxConsecutiveActions: 3,
  },
  scanners: {
    codeQuality: defaultScanner(true, '10m'),
    security: defaultScanner(true, '2m'),
    performance: defaultScanner(true, '15m'),
    accessibility: defaultScanner(true, '30m'),
    dependencies: defaultScanner(true, '15m'),
    secrets: defaultScanner(true, '2m'),
    coverage: defaultScanner(true, '10m'),
    style: defaultScanner(true, '15m'),
    docs: defaultScanner(true, '20m'),
    infra: defaultScanner(true, '30m'),
  },
  bhp: {
    preferredPatterns: ['compliant', 'auditable', 'documented', 'traceable'],
    avoidedPatterns: ['suppression', 'bypass', 'untested', 'undocumented'],
    learningRate: 0.2,
    adaptationStyle: 'conservative',
    feedbackThreshold: 0.7,
    patternMemorySize: 200,
  },
  continuity: {
    maxSessionDuration: 7200,
    idleTimeout: 900,
    saveInterval: 60,
    restoreOnStartup: true,
    checkpointStrategy: 'both',
    sessionPersistence: true,
    crashRecovery: true,
  },
  safety: {
    maxTokensPerAction: 4000,
    requireApprovalFor: ['delete', 'install', 'network', 'execute', 'config'],
    allowedPaths: ['.'],
    blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill', 'wget', 'curl'],
    maxConcurrentOps: 1,
    sandboxLevel: 'strict',
    outputValidation: true,
    promptGuardrails: true,
  },
  ui: {
    theme: 'light',
    fontSize: 14,
    layout: 'default',
    showMiniMap: true,
    confirmDialogs: true,
    denseMode: false,
    showStatusBar: true,
  },
  notifications: {
    channels: ['toast', 'terminal', 'email', 'webhook'],
    quietHours: { start: '20:00', end: '08:00' },
    urgencyFilter: { min: 2, max: 10 },
    onError: 'always',
    onComplete: 'always',
    onWarning: 'always',
    rateLimit: 30,
  },
  telemetry: {
    enabled: true,
    level: 'standard',
    retentionDays: 90,
    anonymize: true,
    metricsPath: '.ideia/metrics',
    includeStackTraces: false,
  },
  advanced: {
    experimentalFeatures: false,
    debugMode: false,
    logLevel: 'info',
    pluginAllowList: [],
    networkProxy: null,
    customEnv: {},
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

const customConfig: FullConfig = {
  autonomy: {
    level: 'assisted',
    riskThreshold: 'medium',
    autoFixCategories: [],
    confirmBeforeWrite: true,
    autoContinueAfter: 5,
    autoDecideOnMatch: 8,
    maxConsecutiveActions: 5,
  },
  scanners: {
    codeQuality: defaultScanner(true),
    security: defaultScanner(true),
    performance: defaultScanner(false),
    accessibility: defaultScanner(false),
    dependencies: defaultScanner(true),
    secrets: defaultScanner(true),
    coverage: defaultScanner(true),
    style: defaultScanner(false),
    docs: defaultScanner(false),
    infra: defaultScanner(false),
  },
  bhp: {
    preferredPatterns: [],
    avoidedPatterns: [],
    learningRate: 0.5,
    adaptationStyle: 'balanced',
    feedbackThreshold: 0.5,
    patternMemorySize: 100,
  },
  continuity: {
    maxSessionDuration: 14400,
    idleTimeout: 600,
    saveInterval: 30,
    restoreOnStartup: true,
    checkpointStrategy: 'periodic',
    sessionPersistence: true,
    crashRecovery: true,
  },
  safety: {
    maxTokensPerAction: 8000,
    requireApprovalFor: ['delete', 'install', 'network'],
    allowedPaths: ['.'],
    blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'],
    maxConcurrentOps: 1,
    sandboxLevel: 'basic',
    outputValidation: true,
    promptGuardrails: true,
  },
  ui: {
    theme: 'system',
    fontSize: 14,
    layout: 'default',
    showMiniMap: true,
    confirmDialogs: true,
    denseMode: false,
    showStatusBar: true,
  },
  notifications: {
    channels: ['toast', 'terminal'],
    quietHours: null,
    urgencyFilter: { min: 1, max: 10 },
    onError: 'always',
    onComplete: 'summary',
    onWarning: 'summary',
    rateLimit: 50,
  },
  telemetry: {
    enabled: false,
    level: 'minimal',
    retentionDays: 7,
    anonymize: true,
    metricsPath: null,
    includeStackTraces: false,
  },
  advanced: {
    experimentalFeatures: false,
    debugMode: false,
    logLevel: 'info',
    pluginAllowList: [],
    networkProxy: null,
    customEnv: {},
    maxRetries: 3,
    retryDelayMs: 1000,
  },
};

const PRESET_DEFINITIONS: Record<string, FullConfig> = {
  'solo-dev': soloDevConfig,
  'tech-lead': techLeadConfig,
  'automator': automatorConfig,
  'enterprise': enterpriseConfig,
  'custom': customConfig,
};

const PRESET_META: Record<string, { name: string; description: string }> = {
  'solo-dev': { name: 'Solo Developer', description: 'Balanced profile for individual developers — assisted autonomy with safety nets' },
  'tech-lead': { name: 'Tech Lead', description: 'Autonomous profile for experienced leads — high productivity with moderate risk' },
  'automator': { name: 'Automator', description: 'Maximum autonomy for CI/CD and automation — aggressive risk tolerance' },
  'enterprise': { name: 'Enterprise', description: 'Compliant profile for regulated environments — safety-first with full auditing' },
  'custom': { name: 'Custom', description: 'Starter config for custom tailoring — neutral defaults' },
};

function makeProfile(presetId: string): ProfileConfig {
  const config = PRESET_DEFINITIONS[presetId];
  const meta = PRESET_META[presetId];
  const now = new Date().toISOString();
  return {
    id: presetId,
    name: meta.name,
    description: meta.description,
    config: JSON.parse(JSON.stringify(config)),
    createdAt: now,
    updatedAt: now,
  };
}

export class Profiles {
  private profiles: Map<string, ProfileConfig> = new Map();
  private eventBus: EventBus;
  private auditTrail: AuditTrail;

  constructor(eventBus: EventBus, auditTrail: AuditTrail) {
    this.eventBus = eventBus;
    this.auditTrail = auditTrail;
    for (const id of Object.keys(PRESET_DEFINITIONS)) {
      this.profiles.set(id, makeProfile(id));
    }
  }

  async apply(profileId: string): Promise<ProfileConfig> {
    const profile = this.profiles.get(profileId);
    if (!profile) throw new Error(`Profile not found: ${profileId}`);
    const result = validate(profile.config);
    if (!result.valid) {
      throw new Error(`Profile validation failed for '${profileId}': ${result.errors.map(e => e.message).join('; ')}`);
    }
    this.auditTrail.append({
      actor: 'system',
      eventType: 'profile.apply',
      target: profileId,
      decision: 'approved',
      result: 'success',
      metadata: { profileId },
    });
    await this.eventBus.emit({
      type: 'profile.applied',
      source: 'profiles',
      payload: { profileId, config: profile.config } as Record<string, unknown>,
    });
    return profile;
  }

  get(id: string): ProfileConfig {
    const profile = this.profiles.get(id);
    if (!profile) throw new Error(`Profile not found: ${id}`);
    return profile;
  }

  list(): ProfileConfig[] {
    return Array.from(this.profiles.values()).map(p => ({ ...p }));
  }

  create(name: string, configOverride: Partial<ProfileConfig>): ProfileConfig {
    const customBase = this.profiles.get('custom');
    if (!customBase) throw new Error('Custom base profile not found');
    const id = `custom-${Date.now()}`;
    const now = new Date().toISOString();
    const profile: ProfileConfig = {
      id,
      name,
      description: configOverride.description ?? 'Custom profile',
      config: { ...customBase.config, ...configOverride.config },
      createdAt: now,
      updatedAt: now,
    };
    this.profiles.set(id, profile);
    return profile;
  }

  export(id: string): string {
    const profile = this.get(id);
    return JSON.stringify(profile, null, 2);
  }

  import(data: string): ProfileConfig {
    const parsed = JSON.parse(data) as ProfileConfig;
    if (!parsed.id || !parsed.name || !parsed.config) {
      throw new Error('Invalid profile data: missing id, name, or config');
    }
    const result = validate(parsed.config);
    if (!result.valid) {
      throw new Error(`Imported profile validation failed: ${result.errors.map(e => e.message).join('; ')}`);
    }
    const now = new Date().toISOString();
    parsed.createdAt = parsed.createdAt || now;
    parsed.updatedAt = now;
    this.profiles.set(parsed.id, parsed);
    return parsed;
  }

  reset(id: string): void {
    if (PRESET_DEFINITIONS[id]) {
      this.profiles.set(id, makeProfile(id));
    } else {
      this.profiles.delete(id);
    }
  }

  getPresetIds(): string[] {
    return Object.keys(PRESET_DEFINITIONS);
  }
}

export function createProfiles(eventBus: EventBus, auditTrail: AuditTrail): Profiles {
  return new Profiles(eventBus, auditTrail);
}
