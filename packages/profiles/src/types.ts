export type ProfileId = 'solo-dev' | 'tech-lead' | 'automator' | 'enterprise' | 'custom' | 'student' | 'reviewer';

export interface ProfileStats {
  totalInteractions: number;
  errorRate: number;
  approvalRate: number;
  commandFrequency: number;
  featureDiversity: number;
  averageSessionTime: number;
  topFeatures: string[];
  preferredAutonomy: string;
}
export type AutonomyLevel = 'passive' | 'assisted' | 'autonomous';
export type RiskThreshold = 'low' | 'medium' | 'high';
export type NotificationChannel = 'toast' | 'terminal' | 'sound' | 'email' | 'webhook' | 'slack' | 'pager';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'silent';
export type ThemeMode = 'light' | 'dark' | 'system';
export type LayoutMode = 'default' | 'compact' | 'spacious';
export type SandboxLevel = 'none' | 'minimal' | 'basic' | 'standard' | 'strict' | 'isolated';
export type TelemetryLevel = 'minimal' | 'standard' | 'verbose' | 'full';
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
