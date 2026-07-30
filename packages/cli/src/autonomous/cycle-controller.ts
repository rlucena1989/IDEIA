import { AutonomousCycle, DriftSignal } from './autonomous-types';
import { createLogger } from '@ideia/logger';
const logger = createLogger('cycle-controller');

export interface CycleConfig {
  maxDurationMs: number;
  requireHumanApproval: boolean;
  autoResolveThreshold: number;
  maxIterations: number;
}

const DEFAULT_CONFIG: CycleConfig = {
  maxDurationMs: 3600000, // 1 hour
  requireHumanApproval: false,
  autoResolveThreshold: 0.8,
  maxIterations: 10,
};

export function startCycle(config: Partial<CycleConfig> = {}): AutonomousCycle {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  return {
    cycleId: `cycle-${Date.now()}`,
    startedAt: new Date().toISOString(),
    status: 'running',
    notes: [
      `Autonomous cycle started. Config: maxDuration=${finalConfig.maxDurationMs}ms, ` +
      `requireHumanApproval=${finalConfig.requireHumanApproval}, ` +
      `autoResolveThreshold=${finalConfig.autoResolveThreshold}`,
    ],
  };
}

export function endCycle(cycle: AutonomousCycle, status: AutonomousCycle['status'], note: string): AutonomousCycle {
  return {
    ...cycle,
    endedAt: new Date().toISOString(),
    status,
    notes: [...cycle.notes, note],
  };
}

export function canProceedWithoutHumanIntervention(
  cycle: AutonomousCycle,
  drifts: DriftSignal[],
  config: Partial<CycleConfig> = {},
): boolean {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // If human approval is required, cannot proceed autonomously
  if (finalConfig.requireHumanApproval) {
    return false;
  }
  
  // Check if cycle has exceeded max duration
  if (cycle.endedAt) {
    const duration = new Date(cycle.endedAt).getTime() - new Date(cycle.startedAt).getTime();
    if (duration > finalConfig.maxDurationMs) {
      return false;
    }
  }
  
  // Check if there are critical drifts that require human intervention
  const hasCriticalDrifts = drifts.some(d => d.severity === 'critical');
  if (hasCriticalDrifts) {
    return false;
  }
  
  // Check if confidence level meets threshold for auto-resolution
  const avgConfidence = drifts.length > 0 
    ? drifts.reduce((sum, d) => sum + (d as any).confidence || 0, 0) / drifts.length 
    : 1;
  
  return avgConfidence >= finalConfig.autoResolveThreshold;
}

export function executeAutonomousCycle(
  cycle: AutonomousCycle,
  drifts: DriftSignal[],
  config: Partial<CycleConfig> = {},
): AutonomousCycle {
  const canProceed = canProceedWithoutHumanIntervention(cycle, drifts, config);
  
  if (!canProceed) {
    return endCycle(cycle, 'blocked', 'Cycle blocked: requires human intervention or critical drift detected');
  }
  
  // Simulate autonomous execution
  const resolvedDrifts = drifts.filter(d => d.severity !== 'critical');
  const notes = [
    ...cycle.notes,
    `Autonomous execution completed. Resolved ${resolvedDrifts.length}/${drifts.length} drifts without human intervention.`,
  ];
  
  return endCycle(
    { ...cycle, notes },
    'completed',
    'Cycle completed autonomously without human intervention',
  );
}

export function checkCycleHealth(cycle: AutonomousCycle): 'healthy' | 'degraded' | 'blocked' {
  if (cycle.status === 'blocked') return 'blocked';
  if (cycle.status === 'degraded') return 'degraded';
  if (cycle.status === 'completed') return 'healthy';
  
  // Check if cycle is running too long
  const duration = Date.now() - new Date(cycle.startedAt).getTime();
  if (duration > DEFAULT_CONFIG.maxDurationMs) {
    return 'degraded';
  }
  
  return 'healthy';
}
