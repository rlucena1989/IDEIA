import { describe, it, expect } from '@jest/globals';
import { validate, isConfigValid, validateProfile } from '../src/config-validator';
import type { FullConfig } from '../src/config-types';

const makeMinimalConfig = (): FullConfig => ({
  autonomy: { level: 'assisted', riskThreshold: 'low', autoFixCategories: ['style'], confirmBeforeWrite: true, autoContinueAfter: 5, autoDecideOnMatch: 8, maxConsecutiveActions: 5 },
  scanners: { codeQuality: { enabled: true }, security: { enabled: true }, performance: { enabled: false }, accessibility: { enabled: false }, dependencies: { enabled: true }, secrets: { enabled: true }, coverage: { enabled: true }, style: { enabled: true }, docs: { enabled: true }, infra: { enabled: false } },
  bhp: { preferredPatterns: [], avoidedPatterns: [], learningRate: 0.3, adaptationStyle: 'conservative', feedbackThreshold: 0.6, patternMemorySize: 100 },
  continuity: { maxSessionDuration: 14400, idleTimeout: 600, saveInterval: 30, restoreOnStartup: true, checkpointStrategy: 'periodic', sessionPersistence: true, crashRecovery: true },
  safety: { maxTokensPerAction: 8000, requireApprovalFor: ['delete'], allowedPaths: ['.'], blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'], maxConcurrentOps: 1, sandboxLevel: 'basic', outputValidation: true, promptGuardrails: true },
  ui: { theme: 'dark', fontSize: 14, layout: 'default', showMiniMap: true, confirmDialogs: true, denseMode: false, showStatusBar: true },
  notifications: { channels: ['toast'], quietHours: null, urgencyFilter: { min: 1, max: 10 }, onError: 'always', onComplete: 'summary', onWarning: 'summary', rateLimit: 50 },
  telemetry: { enabled: true, level: 'standard', retentionDays: 30, anonymize: true, metricsPath: null, includeStackTraces: false },
  advanced: { experimentalFeatures: false, debugMode: false, logLevel: 'info', pluginAllowList: [], networkProxy: null, customEnv: {}, maxRetries: 3, retryDelayMs: 1000 },
});

describe('profiles', () => {
  it('validate returns result for valid config', () => {
    const result = validate(makeMinimalConfig());
    expect(result).toBeDefined();
    expect(typeof result.valid).toBe('boolean');
    expect(Array.isArray(result.errors)).toBe(true);
    expect(Array.isArray(result.warnings)).toBe(true);
  });

  it('isConfigValid returns boolean', () => {
    const result = isConfigValid(makeMinimalConfig());
    expect(typeof result).toBe('boolean');
  });

  it('validateProfile works with proper config', () => {
    const config = makeMinimalConfig();
    const result = validateProfile({ id: 'test', name: 'Test', description: '', config, createdAt: '', updatedAt: '' });
    expect(result).toBeDefined();
  });

  it('validate rejects invalid config', () => {
    const result = validate({});
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
