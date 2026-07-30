import type { FullConfig, ProfileConfig } from './config-types';
import { createLogger } from '@ideia/logger';
import { ProfileId } from './types';
const logger = createLogger('presets');

export const PROFILE_PRESETS: Record<ProfileId, Record<string, any>> = {
  'solo-dev': {
    autonomy: { level: 'assisted', riskThreshold: 'low' },
    scanners: { codeQuality: { enabled: true, interval: '10m', severity: 'warning', failOnError: false }, security: { enabled: true, interval: '5m', severity: 'warning', failOnError: false }, performance: { enabled: false, interval: '15m', severity: 'warning', failOnError: false } },
    bhp: { learningRate: 0.3, adaptationStyle: 'conservative', feedbackThreshold: 0.6, patternMemorySize: 100, preferredPatterns: ['functional', 'modular', 'typed'], avoidedPatterns: ['magic-strings', 'any-types'] },
    continuity: { maxSessionDuration: 14400, idleTimeout: 600, saveInterval: 30, restoreOnStartup: true, checkpointStrategy: 'periodic', sessionPersistence: true, crashRecovery: true },
    safety: { sandboxLevel: 'basic', auditEnabled: true, eStopEnabled: true },
    ui: { theme: 'dark', layout: 'compact', showTips: true, fontSize: 13 },
    notifications: { channels: ['toast', 'terminal'], quietHours: false, maxRatePerMinute: 5 },
    telemetry: { level: 'standard', crashReporting: true, usageStats: true },
    advanced: { maxParallelAgents: 2, defaultTimeout: 30000, retryOnFailure: true, maxRetries: 3 },
  },
  'tech-lead': {
    autonomy: { level: 'assisted', riskThreshold: 'medium' },
    scanners: { codeQuality: { enabled: true, interval: '5m', severity: 'warning', failOnError: true }, security: { enabled: true, interval: '3m', severity: 'error', failOnError: true }, performance: { enabled: true, interval: '10m', severity: 'warning', failOnError: false } },
    bhp: { learningRate: 0.5, adaptationStyle: 'balanced', feedbackThreshold: 0.7, patternMemorySize: 200, preferredPatterns: ['modular', 'typed', 'tested'], avoidedPatterns: ['magic-strings', 'any-types', 'deep-nesting'] },
    continuity: { maxSessionDuration: 28800, idleTimeout: 900, saveInterval: 15, restoreOnStartup: true, checkpointStrategy: 'both', sessionPersistence: true, crashRecovery: true },
    safety: { sandboxLevel: 'strict', auditEnabled: true, eStopEnabled: true },
    ui: { theme: 'dark', layout: 'default', showTips: false, fontSize: 14 },
    notifications: { channels: ['toast', 'terminal', 'email'], quietHours: true, maxRatePerMinute: 10 },
    telemetry: { level: 'verbose', crashReporting: true, usageStats: true },
    advanced: { maxParallelAgents: 4, defaultTimeout: 60000, retryOnFailure: true, maxRetries: 3 },
  },
  'automator': {
    autonomy: { level: 'autonomous', riskThreshold: 'medium' },
    scanners: { codeQuality: { enabled: true, interval: '5m', severity: 'warning', failOnError: false }, security: { enabled: true, interval: '3m', severity: 'error', failOnError: true }, performance: { enabled: true, interval: '10m', severity: 'warning', failOnError: false } },
    bhp: { learningRate: 0.7, adaptationStyle: 'aggressive', feedbackThreshold: 0.8, patternMemorySize: 500, preferredPatterns: ['functional', 'typed', 'performant'], avoidedPatterns: ['any-types', 'deep-nesting'] },
    continuity: { maxSessionDuration: 43200, idleTimeout: 1800, saveInterval: 10, restoreOnStartup: true, checkpointStrategy: 'on-change', sessionPersistence: true, crashRecovery: true },
    safety: { sandboxLevel: 'strict', auditEnabled: true, eStopEnabled: true },
    ui: { theme: 'dark', layout: 'compact', showTips: false, fontSize: 12 },
    notifications: { channels: ['toast', 'terminal'], quietHours: false, maxRatePerMinute: 15 },
    telemetry: { level: 'verbose', crashReporting: true, usageStats: true },
    advanced: { maxParallelAgents: 8, defaultTimeout: 120000, retryOnFailure: true, maxRetries: 5 },
  },
  'enterprise': {
    autonomy: { level: 'assisted', riskThreshold: 'high' },
    scanners: { codeQuality: { enabled: true, interval: '3m', severity: 'error', failOnError: true }, security: { enabled: true, interval: '1m', severity: 'error', failOnError: true }, performance: { enabled: true, interval: '5m', severity: 'error', failOnError: true } },
    bhp: { learningRate: 0.3, adaptationStyle: 'conservative', feedbackThreshold: 0.9, patternMemorySize: 1000, preferredPatterns: ['typed', 'tested', 'documented'], avoidedPatterns: ['magic-strings', 'any-types', 'deep-nesting', 'untested'] },
    continuity: { maxSessionDuration: 86400, idleTimeout: 3600, saveInterval: 5, restoreOnStartup: true, checkpointStrategy: 'both', sessionPersistence: true, crashRecovery: true },
    safety: { sandboxLevel: 'isolated', auditEnabled: true, eStopEnabled: true },
    ui: { theme: 'system', layout: 'default', showTips: true, fontSize: 14 },
    notifications: { channels: ['toast', 'terminal', 'email', 'webhook'], quietHours: true, maxRatePerMinute: 20 },
    telemetry: { level: 'verbose', crashReporting: true, usageStats: true },
    advanced: { maxParallelAgents: 16, defaultTimeout: 300000, retryOnFailure: true, maxRetries: 5 },
  },
  'custom': {
    autonomy: { level: 'assisted', riskThreshold: 'low' },
    scanners: { codeQuality: { enabled: true, interval: '15m', severity: 'warning', failOnError: false }, security: { enabled: true, interval: '15m', severity: 'warning', failOnError: false }, performance: { enabled: false, interval: '15m', severity: 'warning', failOnError: false } },
    bhp: { learningRate: 0.3, adaptationStyle: 'conservative', feedbackThreshold: 0.6, patternMemorySize: 100, preferredPatterns: ['modular'], avoidedPatterns: [] },
    continuity: { maxSessionDuration: 14400, idleTimeout: 600, saveInterval: 30, restoreOnStartup: true, checkpointStrategy: 'periodic', sessionPersistence: true, crashRecovery: true },
    safety: { sandboxLevel: 'basic', auditEnabled: true, eStopEnabled: true },
    ui: { theme: 'dark', layout: 'default', showTips: true, fontSize: 13 },
    notifications: { channels: ['toast'], quietHours: false, maxRatePerMinute: 5 },
    telemetry: { level: 'standard', crashReporting: true, usageStats: true },
    advanced: { maxParallelAgents: 2, defaultTimeout: 30000, retryOnFailure: true, maxRetries: 3 },
  },
  'student': {
    autonomy: { level: 'passive', riskThreshold: 'low' },
    scanners: { codeQuality: { enabled: true, interval: '30m', severity: 'info', failOnError: false }, security: { enabled: true, interval: '15m', severity: 'warning', failOnError: false }, performance: { enabled: false, interval: '30m', severity: 'info', failOnError: false } },
    bhp: { learningRate: 0.2, adaptationStyle: 'conservative', feedbackThreshold: 0.5, patternMemorySize: 50, preferredPatterns: ['simple', 'documented'], avoidedPatterns: ['complex', 'magic-strings'] },
    continuity: { maxSessionDuration: 7200, idleTimeout: 1200, saveInterval: 60, restoreOnStartup: true, checkpointStrategy: 'periodic', sessionPersistence: true, crashRecovery: true },
    safety: { sandboxLevel: 'strict', auditEnabled: true, eStopEnabled: true },
    ui: { theme: 'light', layout: 'default', showTips: true, fontSize: 15 },
    notifications: { channels: ['toast', 'terminal'], quietHours: false, maxRatePerMinute: 10 },
    telemetry: { level: 'standard', crashReporting: true, usageStats: true },
    advanced: { maxParallelAgents: 1, defaultTimeout: 60000, retryOnFailure: true, maxRetries: 5 },
  },
  'reviewer': {
    autonomy: { level: 'assisted', riskThreshold: 'low' },
    scanners: { codeQuality: { enabled: true, interval: '5m', severity: 'error', failOnError: true }, security: { enabled: true, interval: '5m', severity: 'error', failOnError: true }, performance: { enabled: true, interval: '10m', severity: 'warning', failOnError: false } },
    bhp: { learningRate: 0.4, adaptationStyle: 'balanced', feedbackThreshold: 0.8, patternMemorySize: 300, preferredPatterns: ['typed', 'tested', 'documented'], avoidedPatterns: ['any-types', 'deep-nesting', 'untested'] },
    continuity: { maxSessionDuration: 14400, idleTimeout: 600, saveInterval: 30, restoreOnStartup: true, checkpointStrategy: 'on-change', sessionPersistence: true, crashRecovery: true },
    safety: { sandboxLevel: 'strict', auditEnabled: true, eStopEnabled: true },
    ui: { theme: 'dark', layout: 'compact', showTips: false, fontSize: 13 },
    notifications: { channels: ['toast', 'terminal', 'email'], quietHours: false, maxRatePerMinute: 20 },
    telemetry: { level: 'verbose', crashReporting: true, usageStats: true },
    advanced: { maxParallelAgents: 3, defaultTimeout: 120000, retryOnFailure: true, maxRetries: 3 },
  },
};

export function getPreset(id: ProfileId): ProfileConfig {
  const preset = PROFILE_PRESETS[id];
  if (!preset) throw new Error(`Profile preset "${id}" not found`);
  return { ...preset } as unknown as ProfileConfig;
}

export function getPresetIds(): ProfileId[] {
  return Object.keys(PROFILE_PRESETS) as ProfileId[];
}
