export type ProfileId = 'solo-dev' | 'tech-lead' | 'automator' | 'enterprise' | 'custom';
export type AutonomyLevel = 'passive' | 'assisted' | 'autonomous';
export type RiskThreshold = 'low' | 'medium' | 'high';
export type NotificationChannel = 'toast' | 'terminal' | 'sound' | 'email' | 'webhook';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutMode = 'default' | 'compact' | 'spacious';
export type SandboxLevel = 'none' | 'basic' | 'strict' | 'isolated';
export type TelemetryLevel = 'minimal' | 'standard' | 'verbose';
export type ContinuityStrategy = 'periodic' | 'on-change' | 'on-demand';
export type CheckpointStrategy = 'git' | 'internal' | 'both' | 'periodic' | 'on-change' | 'on-demand';
export type AdaptationStyle = 'conservative' | 'balanced' | 'aggressive';
export type UrgencyLevel = 'low' | 'normal' | 'high' | 'critical';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  steps: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  severity: 'error';
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
  severity: 'warning';
}
