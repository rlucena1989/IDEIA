import type { AutonomyLevel, RiskThreshold, SandboxLevel, TelemetryLevel, ContinuityStrategy, CheckpointStrategy, AdaptationStyle, ThemeMode, LayoutMode, NotificationChannel, LogLevel } from './types';

export interface AutonomyConfig {
  level: AutonomyLevel;
  riskThreshold: RiskThreshold;
  autoFixCategories: string[];
  confirmBeforeWrite: boolean;
  autoContinueAfter: number;
  autoDecideOnMatch: number;
  maxConsecutiveActions: number;
}

export interface ScannerEntry {
  enabled: boolean;
  interval?: string;
  severity?: 'error' | 'warning' | 'info';
  failOnError?: boolean;
}

export interface ScannersConfig {
  codeQuality: ScannerEntry;
  security: ScannerEntry;
  performance: ScannerEntry;
  accessibility: ScannerEntry;
  dependencies: ScannerEntry;
  secrets: ScannerEntry;
  coverage: ScannerEntry;
  style: ScannerEntry;
  docs: ScannerEntry;
  infra: ScannerEntry;
}

export interface BHPConfig {
  preferredPatterns: string[];
  avoidedPatterns: string[];
  learningRate: number;
  adaptationStyle: AdaptationStyle;
  feedbackThreshold: number;
  patternMemorySize: number;
}

export interface ContinuityConfig {
  maxSessionDuration: number;
  idleTimeout: number;
  saveInterval: number;
  restoreOnStartup: boolean;
  checkpointStrategy: CheckpointStrategy;
  sessionPersistence: boolean;
  crashRecovery: boolean;
}

export interface SafetyConfig {
  maxTokensPerAction: number;
  requireApprovalFor: string[];
  allowedPaths: string[];
  blockedCommands: string[];
  maxConcurrentOps: number;
  sandboxLevel: SandboxLevel;
  outputValidation: boolean;
  promptGuardrails: boolean;
}

export interface UIConfig {
  theme: ThemeMode;
  fontSize: number;
  layout: LayoutMode;
  showMiniMap: boolean;
  confirmDialogs: boolean;
  denseMode: boolean;
  showStatusBar: boolean;
}

export interface NotificationsConfig {
  channels: NotificationChannel[];
  quietHours: { start: string; end: string } | null;
  urgencyFilter: { min: number; max: number };
  onError: 'always' | 'summary' | 'never';
  onComplete: 'always' | 'summary' | 'never';
  onWarning: 'always' | 'summary' | 'never';
  rateLimit: number;
}

export interface TelemetryConfig {
  enabled: boolean;
  level: TelemetryLevel;
  retentionDays: number;
  anonymize: boolean;
  metricsPath: string | null;
  includeStackTraces: boolean;
}

export interface AdvancedConfig {
  experimentalFeatures: boolean;
  debugMode: boolean;
  logLevel: LogLevel;
  pluginAllowList: string[];
  networkProxy: string | null;
  customEnv: Record<string, string>;
  maxRetries: number;
  retryDelayMs: number;
}

export interface FullConfig {
  autonomy: AutonomyConfig;
  scanners: ScannersConfig;
  bhp: BHPConfig;
  continuity: ContinuityConfig;
  safety: SafetyConfig;
  ui: UIConfig;
  notifications: NotificationsConfig;
  telemetry: TelemetryConfig;
  advanced: AdvancedConfig;
}

export interface ProfileConfig {
  id: string;
  name: string;
  description: string;
  config: FullConfig;
  createdAt: string;
  updatedAt: string;
}
