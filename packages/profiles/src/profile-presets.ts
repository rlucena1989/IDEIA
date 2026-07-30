import type { FullConfig, ProfileConfig } from './config-types';

const defaultScanner = (enabled: boolean, interval?: string) => ({ enabled, interval: interval ?? '15m', severity: 'warning' as const, failOnError: false });

const soloDevConfig: FullConfig = {
  autonomy: { level: 'assisted', riskThreshold: 'low', autoFixCategories: ['style', 'docs', 'refactor'], confirmBeforeWrite: true, autoContinueAfter: 5, autoDecideOnMatch: 8, maxConsecutiveActions: 5 },
  scanners: { codeQuality: defaultScanner(true, '10m'), security: defaultScanner(true, '5m'), performance: defaultScanner(false), accessibility: defaultScanner(false), dependencies: defaultScanner(true, '30m'), secrets: defaultScanner(true, '5m'), coverage: defaultScanner(true, '15m'), style: defaultScanner(true, '10m'), docs: defaultScanner(true, '20m'), infra: defaultScanner(false) },
  bhp: { preferredPatterns: ['functional', 'modular', 'typed'], avoidedPatterns: ['magic-strings', 'any-types', 'deep-nesting'], learningRate: 0.3, adaptationStyle: 'conservative', feedbackThreshold: 0.6, patternMemorySize: 100 },
  continuity: { maxSessionDuration: 14400, idleTimeout: 600, saveInterval: 30, restoreOnStartup: true, checkpointStrategy: 'periodic', sessionPersistence: true, crashRecovery: true },
  safety: { maxTokensPerAction: 8000, requireApprovalFor: ['delete', 'install', 'network'], allowedPaths: ['.'], blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'], maxConcurrentOps: 1, sandboxLevel: 'basic', outputValidation: true, promptGuardrails: true },
  ui: { theme: 'system', fontSize: 14, layout: 'default', showMiniMap: true, confirmDialogs: true, denseMode: false, showStatusBar: true },
  notifications: { channels: ['toast', 'terminal'], quietHours: null, urgencyFilter: { min: 1, max: 10 }, onError: 'always', onComplete: 'summary', onWarning: 'summary', rateLimit: 50 },
  telemetry: { enabled: false, level: 'minimal', retentionDays: 7, anonymize: true, metricsPath: null, includeStackTraces: false },
  advanced: { experimentalFeatures: false, debugMode: false, logLevel: 'info', pluginAllowList: [], networkProxy: null, customEnv: {}, maxRetries: 3, retryDelayMs: 1000 },
};

const techLeadConfig: FullConfig = {
  ...soloDevConfig,
  autonomy: { ...soloDevConfig.autonomy, level: 'autonomous', riskThreshold: 'medium', autoFixCategories: [...(soloDevConfig.autonomy.autoFixCategories || []), 'security', 'performance'], confirmBeforeWrite: false, autoContinueAfter: 3, autoDecideOnMatch: 6, maxConsecutiveActions: 10 },
  scanners: { ...soloDevConfig.scanners, codeQuality: defaultScanner(true, '5m'), security: defaultScanner(true, '2m'), performance: defaultScanner(true, '10m'), coverage: defaultScanner(true, '10m') },
  bhp: { ...soloDevConfig.bhp, learningRate: 0.5, adaptationStyle: 'balanced', feedbackThreshold: 0.7, patternMemorySize: 200 },
  safety: { ...soloDevConfig.safety, sandboxLevel: 'standard', maxConcurrentOps: 3 },
  notifications: { ...soloDevConfig.notifications, channels: ['toast', 'terminal', 'email'] },
  telemetry: { ...soloDevConfig.telemetry, enabled: true, level: 'standard' },
};

const automatorConfig: FullConfig = {
  ...techLeadConfig,
  autonomy: { ...techLeadConfig.autonomy, level: 'autonomous', riskThreshold: 'high', confirmBeforeWrite: false, autoContinueAfter: 2, autoDecideOnMatch: 4, maxConsecutiveActions: 20 },
  scanners: { ...techLeadConfig.scanners, codeQuality: defaultScanner(false), security: defaultScanner(true, '1m'), performance: defaultScanner(false) },
  bhp: { ...techLeadConfig.bhp, learningRate: 0.8, adaptationStyle: 'aggressive', feedbackThreshold: 0.4, patternMemorySize: 500 },
  safety: { ...techLeadConfig.safety, sandboxLevel: 'minimal', maxConcurrentOps: 10, blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'] },
  notifications: { ...techLeadConfig.notifications, channels: ['toast'], rateLimit: 100 },
  telemetry: { ...techLeadConfig.telemetry, level: 'verbose' },
};

const enterpriseConfig: FullConfig = {
  ...soloDevConfig,
  autonomy: { ...soloDevConfig.autonomy, level: 'assisted', riskThreshold: 'low', autoFixCategories: ['style', 'docs'], confirmBeforeWrite: true, autoContinueAfter: 10, maxConsecutiveActions: 3 },
  scanners: { ...soloDevConfig.scanners, codeQuality: defaultScanner(true, '5m'), security: defaultScanner(true, '1m'), dependencies: defaultScanner(true, '15m'), secrets: defaultScanner(true, '2m'), coverage: defaultScanner(true, '10m') },
  bhp: { preferredPatterns: ['typed', 'tested', 'documented'], avoidedPatterns: ['any-types', 'magic-strings', 'quick-fix'], learningRate: 0.2, adaptationStyle: 'conservative', feedbackThreshold: 0.8, patternMemorySize: 300 },
  safety: { maxTokensPerAction: 16000, requireApprovalFor: ['delete', 'install', 'network', 'execute', 'config'], allowedPaths: ['.'], blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill', 'wget', 'curl', 'chmod', 'chown'], maxConcurrentOps: 1, sandboxLevel: 'strict', outputValidation: true, promptGuardrails: true },
  notifications: { channels: ['toast', 'email', 'slack', 'pager'], quietHours: { start: '22:00', end: '07:00' }, urgencyFilter: { min: 5, max: 10 }, onError: 'always', onComplete: 'never', onWarning: 'summary', rateLimit: 10 },
  telemetry: { enabled: true, level: 'full', retentionDays: 90, anonymize: false, metricsPath: '.ai/metrics', includeStackTraces: true },
  advanced: { experimentalFeatures: false, debugMode: false, logLevel: 'warn', pluginAllowList: [], networkProxy: null, customEnv: {}, maxRetries: 5, retryDelayMs: 2000 },
};

const customConfig: FullConfig = {
  autonomy: { level: 'assisted', riskThreshold: 'medium', autoFixCategories: [], confirmBeforeWrite: true, autoContinueAfter: 5, autoDecideOnMatch: 8, maxConsecutiveActions: 5 },
  scanners: { codeQuality: defaultScanner(true), security: defaultScanner(true), performance: defaultScanner(false), accessibility: defaultScanner(false), dependencies: defaultScanner(true), secrets: defaultScanner(true), coverage: defaultScanner(true), style: defaultScanner(false), docs: defaultScanner(false), infra: defaultScanner(false) },
  bhp: { preferredPatterns: [], avoidedPatterns: [], learningRate: 0.5, adaptationStyle: 'balanced', feedbackThreshold: 0.5, patternMemorySize: 100 },
  continuity: { maxSessionDuration: 14400, idleTimeout: 600, saveInterval: 30, restoreOnStartup: true, checkpointStrategy: 'periodic', sessionPersistence: true, crashRecovery: true },
  safety: { maxTokensPerAction: 8000, requireApprovalFor: ['delete', 'install', 'network'], allowedPaths: ['.'], blockedCommands: ['rm', 'del', 'format', 'dd', 'mkfs', 'shutdown', 'halt', 'poweroff', 'reboot', 'init', 'killall', 'pkill'], maxConcurrentOps: 1, sandboxLevel: 'basic', outputValidation: true, promptGuardrails: true },
  ui: { theme: 'system', fontSize: 14, layout: 'default', showMiniMap: true, confirmDialogs: true, denseMode: false, showStatusBar: true },
  notifications: { channels: ['toast', 'terminal'], quietHours: null, urgencyFilter: { min: 1, max: 10 }, onError: 'always', onComplete: 'summary', onWarning: 'summary', rateLimit: 50 },
  telemetry: { enabled: false, level: 'minimal', retentionDays: 7, anonymize: true, metricsPath: null, includeStackTraces: false },
  advanced: { experimentalFeatures: false, debugMode: false, logLevel: 'info', pluginAllowList: [], networkProxy: null, customEnv: {}, maxRetries: 3, retryDelayMs: 1000 },
};

const studentConfig: FullConfig = JSON.parse(JSON.stringify(soloDevConfig));
studentConfig.autonomy.level = 'passive';
studentConfig.autonomy.riskThreshold = 'low';
studentConfig.autonomy.autoFixCategories = ['style', 'docs'];
studentConfig.autonomy.confirmBeforeWrite = true;
studentConfig.autonomy.maxConsecutiveActions = 2;
studentConfig.bhp.learningRate = 0.2;
studentConfig.bhp.adaptationStyle = 'conservative';
studentConfig.bhp.patternMemorySize = 50;
studentConfig.safety.sandboxLevel = 'strict';
studentConfig.safety.requireApprovalFor = ['delete', 'install', 'network', 'execute', 'config', 'write'];
studentConfig.ui.theme = 'light';
studentConfig.ui.showMiniMap = false;
studentConfig.telemetry.level = 'minimal';

const reviewerConfig: FullConfig = JSON.parse(JSON.stringify(techLeadConfig));
reviewerConfig.autonomy.level = 'assisted';
reviewerConfig.autonomy.riskThreshold = 'low';
reviewerConfig.autonomy.autoFixCategories = ['style', 'docs', 'security'];
reviewerConfig.autonomy.confirmBeforeWrite = true;
reviewerConfig.autonomy.maxConsecutiveActions = 3;
reviewerConfig.scanners.codeQuality = defaultScanner(true, '3m');
reviewerConfig.scanners.security = defaultScanner(true, '3m');
reviewerConfig.bhp.preferredPatterns = ['typed', 'tested', 'documented', 'auditable'];
reviewerConfig.bhp.avoidedPatterns = ['any-types', 'deep-nesting', 'untested', 'undocumented'];
reviewerConfig.bhp.feedbackThreshold = 0.8;
reviewerConfig.ui.layout = 'compact';
reviewerConfig.ui.denseMode = true;
reviewerConfig.notifications.channels = ['toast', 'terminal', 'email'];
reviewerConfig.notifications.rateLimit = 20;

export const PRESET_DEFINITIONS: Record<string, FullConfig> = { 'solo-dev': soloDevConfig, 'tech-lead': techLeadConfig, 'automator': automatorConfig, 'enterprise': enterpriseConfig, 'custom': customConfig, 'student': studentConfig, 'reviewer': reviewerConfig };

const PRESET_META: Record<string, { name: string; description: string }> = {
  'solo-dev': { name: 'Solo Developer', description: 'Balanced profile for individual developers — assisted autonomy with safety nets' },
  'tech-lead': { name: 'Tech Lead', description: 'Autonomous profile for experienced leads — high productivity with moderate risk' },
  'automator': { name: 'Automator', description: 'Maximum autonomy for CI/CD and automation — aggressive risk tolerance' },
  'enterprise': { name: 'Enterprise', description: 'Compliant profile for regulated environments — safety-first with full auditing' },
  'custom': { name: 'Custom', description: 'Starter config for custom tailoring — neutral defaults' },
  'student': { name: 'Student', description: 'Guided profile for learners — passive autonomy with strict guardrails' },
  'reviewer': { name: 'Reviewer', description: 'Code review focused — assisted autonomy with quality gate emphasis' },
};

export function makeProfile(presetId: string): import('./config-types').ProfileConfig {
  const config = PRESET_DEFINITIONS[presetId];
  const meta = PRESET_META[presetId];
  const now = new Date().toISOString();
  return { id: presetId, name: meta.name, description: meta.description, config: JSON.parse(JSON.stringify(config)), createdAt: now, updatedAt: now };
}
