import type { DegradationMode } from '@ideia/resilience-engine';
import { createLogger } from '@ideia/logger';
const logger = createLogger('types');

export interface ResourceSnapshot {
  timestamp: number;
  memory: {
    totalMB: number;
    freeMB: number;
    usedPercent: number;
    processHeapUsedMB: number;
    processHeapTotalMB: number;
    processRSSMB: number;
    processExternalMB: number;
  };
  cpu: {
    loadAvg1m: number;
    loadAvg5m: number;
    loadAvg15m: number;
    cores: number;
    percentEstimate: number;
  };
  uptime: number;
  platform: string;
}

export interface MemoryTrend {
  slope: number;
  intercept: number;
  recentSamples: ResourceSnapshot[];
  isLeaking: boolean;
  leakRateMBperMin: number;
  projectedOOMminutes: number | null;
}

export interface ResourceBudget {
  maxMemoryPercent: number;
  maxCPUPercent: number;
  maxProcessHeapMB: number;
  maxProcessCount: number;
  agentMemoryBudgetMB: number;
  agentCPUBudgetPercent: number;
}

export const DEFAULT_RESOURCE_BUDGET: ResourceBudget = {
  maxMemoryPercent: 80,
  maxCPUPercent: 90,
  maxProcessHeapMB: 2048,
  maxProcessCount: 10,
  agentMemoryBudgetMB: 512,
  agentCPUBudgetPercent: 25,
};

export interface DegradationTrigger {
  reason: string;
  targetMode: DegradationMode;
  metric: string;
  value: number;
  threshold: number;
}

export interface SelfHealingConfig {
  enabled: boolean;
  maxRestartsPerMinute: number;
  cooldownMs: number;
  actions: ('restart' | 'reconnect' | 'clear_cache' | 'kill_process')[];
}

export const DEFAULT_SELF_HEALING_CONFIG: SelfHealingConfig = {
  enabled: true,
  maxRestartsPerMinute: 2,
  cooldownMs: 30000,
  actions: ['clear_cache', 'kill_process', 'reconnect'],
};

export interface ResourceManagerConfig {
  monitorIntervalMs: number;
  memoryTrendSampleSize: number;
  memoryTrendWindowMs: number;
  leakDetectionThreshold: number;
  autoDegrade: boolean;
  selfHealing: SelfHealingConfig;
  budget: ResourceBudget;
}

export const DEFAULT_CONFIG: ResourceManagerConfig = {
  monitorIntervalMs: 5000,
  memoryTrendSampleSize: 12,
  memoryTrendWindowMs: 60000,
  leakDetectionThreshold: 50,
  autoDegrade: true,
  selfHealing: DEFAULT_SELF_HEALING_CONFIG,
  budget: DEFAULT_RESOURCE_BUDGET,
};

export interface ProcessInfo {
  pid: number;
  name: string;
  memMB: number;
  cpuPercent: number;
  cmdLine: string;
  uptimeSec: number;
}
