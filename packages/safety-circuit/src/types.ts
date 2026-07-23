export type TriggerType =
  | 'loop-detection'
  | 'regression-spike'
  | 'breakage-chain'
  | 'resource-exhaustion'
  | 'user-override';

export type SafetyAction = 'allow' | 'pause' | 'stop' | 'rollback' | 'degraded';

export type SafetySeverity = 'info' | 'warning' | 'critical';

export type SafetyMode = 'normal' | 'paused' | 'stopped' | 'rollback' | 'degraded';

export type RecoveryAction = 'rollback' | 'continue' | 'resume';

export interface SafetyDecision {
  action: SafetyAction;
  reason: string;
  severity: SafetySeverity;
  trigger?: TriggerType;
  timestamp: string;
}

export interface TriggerEvent {
  type: TriggerType;
  file?: string;
  details?: string;
  metadata?: Record<string, unknown>;
}

export interface SafetyStatus {
  mode: SafetyMode;
  activeTriggers: { type: TriggerType; reason: string; activatedAt: string }[];
  lastDecision: SafetyDecision | null;
  loopFixCount: Record<string, { count: number; firstFix: string }>;
  coverageDrops: number[];
  breakageChainCount: number;
  resourceUsage: { memoryPercent: number; cpuPercent: number };
}

export interface EstopConfig {
  channels: {
    cli: boolean;
    api: boolean;
    keyboard: boolean;
    autoDetect: boolean;
  };
  checkpointDir?: string;
}

export interface EstopEvent {
  channel: 'cli' | 'api' | 'keyboard' | 'auto-detect';
  reason: string;
  timestamp: string;
  triggeredBy?: string;
}
