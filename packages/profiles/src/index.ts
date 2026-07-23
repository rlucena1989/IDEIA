export { Profiles, createProfiles } from './profiles';
export { validate, validateProfile, isConfigValid } from './config-validator';
export type {
  FullConfig, ProfileConfig,
  AutonomyConfig, ScannersConfig, ScannerEntry,
  BHPConfig, ContinuityConfig, SafetyConfig,
  UIConfig, NotificationsConfig, TelemetryConfig, AdvancedConfig,
} from './config-types';
export type {
  ProfileId, AutonomyLevel, RiskThreshold,
  NotificationChannel, LogLevel, ThemeMode, LayoutMode,
  SandboxLevel, TelemetryLevel, ContinuityStrategy, CheckpointStrategy,
  AdaptationStyle, UrgencyLevel,
  ValidationResult, ValidationError, ValidationWarning,
} from './types';
